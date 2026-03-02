import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { PrismaService } from '../prisma/prisma.service';

// ABI matching the enhanced AuctionNFT.sol contract with AccessControl, provenance, and auction lock
const AUCTION_NFT_ABI = [
  // Minting
  'function mint(address to, string memory uri, string memory auctionId) external returns (uint256)',
  'function mintWithProduct(address to, string memory uri, string memory auctionId, string memory productId) external returns (uint256)',

  // Auction lock
  'function lockForAuction(uint256 tokenId, string memory auctionId) external',
  'function unlockFromAuction(uint256 tokenId) external',
  'function isLocked(uint256 tokenId) external view returns (bool)',
  'function getLockedByAuction(uint256 tokenId) external view returns (string)',

  // Transfers
  'function transferFrom(address from, address to, uint256 tokenId) external',
  'function safeTransferFrom(address from, address to, uint256 tokenId) external',
  'function transferWithProvenance(address from, address to, uint256 tokenId, uint256 salePrice, string memory notes) external',

  // Provenance
  'function recordProvenance(uint256 tokenId, address previousOwner, address newOwner, uint256 salePrice, string memory notes) external',
  'function getProvenanceHistory(uint256 tokenId) external view returns (tuple(address previousOwner, address newOwner, uint256 salePrice, uint256 timestamp, string notes)[])',
  'function getProvenanceChain(uint256 tokenId) external view returns (bytes32[])',
  'function getProvenanceCount(uint256 tokenId) external view returns (uint256)',

  // View functions
  'function ownerOf(uint256 tokenId) external view returns (address)',
  'function tokenURI(uint256 tokenId) external view returns (string)',
  'function getAuctionId(uint256 tokenId) external view returns (string)',
  'function getProductId(uint256 tokenId) external view returns (string)',
  'function totalMinted() external view returns (uint256)',
  'function totalSupply() external view returns (uint256)',
  'function balanceOf(address owner) external view returns (uint256)',

  // Access control
  'function MINTER_ROLE() external view returns (bytes32)',
  'function AUCTION_MANAGER_ROLE() external view returns (bytes32)',
  'function hasRole(bytes32 role, address account) external view returns (bool)',
  'function grantRole(bytes32 role, address account) external',
  'function revokeRole(bytes32 role, address account) external',

  // Events
  'event CertificateMinted(uint256 indexed tokenId, address indexed owner, string auctionId, string metadataUri)',
  'event ProvenanceRecorded(uint256 indexed tokenId, address indexed previousOwner, address indexed newOwner, uint256 salePrice, uint256 timestamp, string notes)',
  'event OwnershipTransferred(uint256 indexed tokenId, address indexed from, address indexed to)',
  'event TokenLocked(uint256 indexed tokenId, string auctionId)',
  'event TokenUnlocked(uint256 indexed tokenId, string auctionId)',
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
];

export interface MintCertificateResult {
  certificate: {
    id: string;
    productId: string;
    tokenId: string;
    contractAddress: string;
    chain: string;
    metadataIpfsHash: string;
    ownerWallet: string;
    mintTxHash: string | null;
    createdAt: Date;
  };
  ipfsUrl: string;
  explorerLink: string;
}

export interface ProvenanceHistoryEntry {
  previousOwner: string;
  newOwner: string;
  salePrice: string;
  timestamp: number;
  notes: string;
}

export interface VerifyCertificateResult {
  isValid: boolean;
  owner: string | null;
  metadata: Record<string, unknown> | null;
  provenanceChain: Array<{
    id: string;
    eventType: string;
    fromWallet: string | null;
    toWallet: string | null;
    price: unknown;
    notes: string | null;
    txHash: string | null;
    timestamp: Date;
  }>;
  onChainProvenance: ProvenanceHistoryEntry[];
}

export interface TokenDetailsResult {
  tokenId: string;
  owner: string | null;
  tokenURI: string | null;
  auctionId: string | null;
  isLocked: boolean;
  lockedByAuction: string | null;
  provenanceCount: number;
  certificate: {
    id: string;
    productId: string;
    contractAddress: string;
    chain: string;
    metadataIpfsHash: string;
    ownerWallet: string;
    mintTxHash: string | null;
    createdAt: Date;
  } | null;
}

@Injectable()
export class NftService {
  private readonly logger = new Logger(NftService.name);
  private provider: ethers.JsonRpcProvider | null = null;
  private wallet: ethers.Wallet | null = null;
  private nftContract: ethers.Contract | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.initializeProvider();
  }

  private initializeProvider(): void {
    const rpcUrl = this.configService.get<string>('BLOCKCHAIN_RPC_URL', 'http://localhost:8545');
    const privateKey = this.configService.get<string>('BLOCKCHAIN_PRIVATE_KEY', '');
    const contractAddress = this.configService.get<string>('AUCTION_NFT_CONTRACT', '');

    try {
      this.provider = new ethers.JsonRpcProvider(rpcUrl);
      if (privateKey) {
        this.wallet = new ethers.Wallet(privateKey, this.provider);
      }
      if (contractAddress && this.wallet) {
        this.nftContract = new ethers.Contract(contractAddress, AUCTION_NFT_ABI, this.wallet);
      }
      this.logger.log(`Blockchain provider initialized: ${rpcUrl}`);
    } catch (error: any) {
      this.logger.warn(`Failed to initialize blockchain provider: ${error.message}`);
    }
  }

  /**
   * Mint an NFT certificate for a product. Uploads metadata to IPFS,
   * calls AuctionNFT.mint() on-chain, and stores a record in the database.
   */
  async mintCertificate(productId: string, ownerWallet: string): Promise<MintCertificateResult> {
    this.logger.log(`Minting NFT certificate for product: ${productId}, owner: ${ownerWallet}`);

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        media: { orderBy: { sortOrder: 'asc' } },
        attributes: true,
        artist: true,
        category: true,
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    const primaryMedia = product.media.find((m) => m.isPrimary) || product.media[0];
    const imageUrl = primaryMedia?.url || '';

    const nftMetadata = {
      name: product.title,
      description: product.shortDescription || product.descriptionHtml || '',
      image: imageUrl,
      attributes: product.attributes.map((attr) => ({
        trait_type: attr.key,
        value: attr.value,
      })),
      properties: {
        condition: product.condition,
        provenance: product.provenanceText || '',
        artistName: product.artist?.name || 'Unknown',
        category: product.category?.name || 'Uncategorized',
        productId: product.id,
      },
    };

    const metadataIpfsHash = await this.uploadToIpfs(nftMetadata);

    const contractAddress = this.configService.get<string>('AUCTION_NFT_CONTRACT', '');
    let tokenId: string;
    let mintTxHash: string | null = null;

    if (this.nftContract && this.wallet) {
      try {
        const tx = await this.nftContract.mint(
          ownerWallet,
          `ipfs://${metadataIpfsHash}`,
          productId,
        );
        const receipt = await tx.wait();
        mintTxHash = receipt.hash;

        // Parse CertificateMinted event from the receipt
        const iface = new ethers.Interface(AUCTION_NFT_ABI);
        let parsedTokenId: string | null = null;

        for (const log of receipt.logs) {
          try {
            const parsed = iface.parseLog({ topics: log.topics, data: log.data });
            if (parsed && parsed.name === 'CertificateMinted') {
              parsedTokenId = parsed.args[0].toString();
              break;
            }
          } catch {
            // Not our event, skip
          }
        }

        tokenId = parsedTokenId || `${receipt.logs[0]?.topics[1] ? parseInt(receipt.logs[0].topics[1], 16) : Date.now()}`;
      } catch (error: any) {
        this.logger.error(`Blockchain mint failed: ${error.message}`);
        tokenId = `pending_${Date.now()}`;
        mintTxHash = null;
      }
    } else {
      this.logger.warn('No blockchain connection, creating off-chain certificate');
      tokenId = `offchain_${Date.now()}`;
    }

    const certificate = await this.prisma.nftCertificate.create({
      data: {
        productId,
        tokenId,
        contractAddress,
        chain: 'polygon',
        metadataIpfsHash,
        ownerWallet,
        mintTxHash,
      },
    });

    await this.prisma.provenanceRecord.create({
      data: {
        productId,
        eventType: 'created',
        toWallet: ownerWallet,
        txHash: mintTxHash,
        notes: `NFT certificate minted. Token ID: ${tokenId}`,
        timestamp: new Date(),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'nft.certificate.minted',
        entityType: 'NftCertificate',
        entityId: certificate.id,
        metadata: {
          productId,
          tokenId,
          ownerWallet,
          contractAddress,
          metadataIpfsHash,
          mintTxHash,
        },
      },
    });

    const chain = this.configService.get<string>('BLOCKCHAIN_NETWORK', 'polygon');
    const explorerBaseUrl =
      chain === 'polygon'
        ? 'https://polygonscan.com'
        : chain === 'mumbai'
          ? 'https://mumbai.polygonscan.com'
          : chain === 'amoy'
            ? 'https://amoy.polygonscan.com'
            : 'https://etherscan.io';

    return {
      certificate,
      ipfsUrl: `https://gateway.pinata.cloud/ipfs/${metadataIpfsHash}`,
      explorerLink: mintTxHash
        ? `${explorerBaseUrl}/tx/${mintTxHash}`
        : `${explorerBaseUrl}/token/${contractAddress}`,
    };
  }

  /**
   * Get NFT details by token ID, combining on-chain and database data.
   */
  async getTokenDetails(tokenId: string): Promise<TokenDetailsResult> {
    this.logger.log(`Getting token details: ${tokenId}`);

    let owner: string | null = null;
    let tokenURIValue: string | null = null;
    let auctionId: string | null = null;
    let locked = false;
    let lockedByAuction: string | null = null;
    let provenanceCount = 0;

    const isOnChain = !tokenId.startsWith('offchain_') && !tokenId.startsWith('pending_');

    if (this.nftContract && isOnChain) {
      try {
        const tokenIdBn = BigInt(tokenId);
        owner = await this.nftContract.ownerOf(tokenIdBn);
        tokenURIValue = await this.nftContract.tokenURI(tokenIdBn);
        auctionId = await this.nftContract.getAuctionId(tokenIdBn);
        locked = await this.nftContract.isLocked(tokenIdBn);
        if (locked) {
          lockedByAuction = await this.nftContract.getLockedByAuction(tokenIdBn);
        }
        provenanceCount = Number(await this.nftContract.getProvenanceCount(tokenIdBn));
      } catch (error: any) {
        this.logger.warn(`On-chain query failed for token ${tokenId}: ${error.message}`);
      }
    }

    const certificate = await this.prisma.nftCertificate.findFirst({
      where: { tokenId },
    });

    if (!certificate && !owner) {
      throw new NotFoundException(`Token with ID ${tokenId} not found`);
    }

    return {
      tokenId,
      owner: owner || certificate?.ownerWallet || null,
      tokenURI: tokenURIValue,
      auctionId,
      isLocked: locked,
      lockedByAuction,
      provenanceCount,
      certificate: certificate
        ? {
            id: certificate.id,
            productId: certificate.productId,
            contractAddress: certificate.contractAddress,
            chain: certificate.chain,
            metadataIpfsHash: certificate.metadataIpfsHash,
            ownerWallet: certificate.ownerWallet,
            mintTxHash: certificate.mintTxHash,
            createdAt: certificate.createdAt,
          }
        : null,
    };
  }

  /**
   * Get NFT certificate by product ID from the database.
   */
  async getCertificateByProduct(productId: string): Promise<{
    certificate: any;
    onChainData: {
      owner: string | null;
      tokenURI: string | null;
      isLocked: boolean;
      provenanceCount: number;
    } | null;
  }> {
    this.logger.log(`Getting certificate for product: ${productId}`);

    const certificate = await this.prisma.nftCertificate.findFirst({
      where: { productId },
      orderBy: { createdAt: 'desc' },
    });

    if (!certificate) {
      throw new NotFoundException(`No NFT certificate found for product ${productId}`);
    }

    let onChainData: {
      owner: string | null;
      tokenURI: string | null;
      isLocked: boolean;
      provenanceCount: number;
    } | null = null;

    const isOnChain =
      !certificate.tokenId.startsWith('offchain_') &&
      !certificate.tokenId.startsWith('pending_');

    if (this.nftContract && isOnChain) {
      try {
        const tokenIdBn = BigInt(certificate.tokenId);
        const owner = await this.nftContract.ownerOf(tokenIdBn);
        const tokenURI = await this.nftContract.tokenURI(tokenIdBn);
        const isLocked = await this.nftContract.isLocked(tokenIdBn);
        const provenanceCount = Number(await this.nftContract.getProvenanceCount(tokenIdBn));

        onChainData = { owner, tokenURI, isLocked, provenanceCount };
      } catch (error: any) {
        this.logger.warn(`On-chain query failed: ${error.message}`);
      }
    }

    return { certificate, onChainData };
  }

  /**
   * Lock a token for an active auction.
   */
  async lockForAuction(
    tokenId: string,
    auctionId: string,
  ): Promise<{ success: boolean; txHash: string | null }> {
    this.logger.log(`Locking token ${tokenId} for auction ${auctionId}`);

    if (!this.nftContract || !this.wallet) {
      this.logger.warn('No blockchain connection, lock operation skipped');
      return { success: false, txHash: null };
    }

    try {
      const tx = await this.nftContract.lockForAuction(BigInt(tokenId), auctionId);
      const receipt = await tx.wait();
      this.logger.log(`Token ${tokenId} locked for auction ${auctionId}, tx: ${receipt.hash}`);
      return { success: true, txHash: receipt.hash };
    } catch (error: any) {
      this.logger.error(`Failed to lock token: ${error.message}`);
      throw new InternalServerErrorException(`Failed to lock token: ${error.message}`);
    }
  }

  /**
   * Unlock a token after auction ends.
   */
  async unlockFromAuction(
    tokenId: string,
  ): Promise<{ success: boolean; txHash: string | null }> {
    this.logger.log(`Unlocking token ${tokenId} from auction`);

    if (!this.nftContract || !this.wallet) {
      this.logger.warn('No blockchain connection, unlock operation skipped');
      return { success: false, txHash: null };
    }

    try {
      const tx = await this.nftContract.unlockFromAuction(BigInt(tokenId));
      const receipt = await tx.wait();
      this.logger.log(`Token ${tokenId} unlocked, tx: ${receipt.hash}`);
      return { success: true, txHash: receipt.hash };
    } catch (error: any) {
      this.logger.error(`Failed to unlock token: ${error.message}`);
      throw new InternalServerErrorException(`Failed to unlock token: ${error.message}`);
    }
  }

  /**
   * Transfer an NFT certificate with on-chain provenance tracking.
   * Uses transferWithProvenance() for atomic transfer + provenance recording.
   */
  async transferCertificate(
    certificateId: string,
    fromWallet: string,
    toWallet: string,
    salePrice?: number,
    notes?: string,
  ): Promise<{ certificate: any; txHash: string | null }> {
    this.logger.log(`Transferring certificate ${certificateId}: ${fromWallet} -> ${toWallet}`);

    const certificate = await this.prisma.nftCertificate.findUnique({
      where: { id: certificateId },
    });

    if (!certificate) {
      throw new NotFoundException(`Certificate with ID ${certificateId} not found`);
    }

    if (certificate.ownerWallet.toLowerCase() !== fromWallet.toLowerCase()) {
      throw new BadRequestException(
        `Wallet ${fromWallet} is not the current owner of this certificate`,
      );
    }

    let txHash: string | null = null;

    if (
      this.nftContract &&
      this.wallet &&
      !certificate.tokenId.startsWith('offchain_') &&
      !certificate.tokenId.startsWith('pending_')
    ) {
      try {
        const priceInWei = salePrice ? ethers.parseEther(salePrice.toString()) : 0n;
        const transferNotes = notes || 'Ownership transferred via Muzayede platform';

        // Use transferWithProvenance for atomic transfer + provenance recording
        const tx = await this.nftContract.transferWithProvenance(
          fromWallet,
          toWallet,
          BigInt(certificate.tokenId),
          priceInWei,
          transferNotes,
        );
        const receipt = await tx.wait();
        txHash = receipt.hash;
      } catch (error: any) {
        this.logger.error(`Blockchain transfer failed: ${error.message}`);
        throw new InternalServerErrorException(
          `Blockchain transfer failed: ${error.message}`,
        );
      }
    } else {
      this.logger.warn('No blockchain connection or off-chain token, performing off-chain transfer');
    }

    const updatedCertificate = await this.prisma.nftCertificate.update({
      where: { id: certificateId },
      data: { ownerWallet: toWallet },
    });

    await this.prisma.provenanceRecord.create({
      data: {
        productId: certificate.productId,
        eventType: 'transferred',
        fromWallet,
        toWallet,
        price: salePrice || null,
        txHash,
        notes: notes || `NFT certificate transferred from ${fromWallet} to ${toWallet}`,
        timestamp: new Date(),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'nft.certificate.transferred',
        entityType: 'NftCertificate',
        entityId: certificateId,
        metadata: {
          productId: certificate.productId,
          tokenId: certificate.tokenId,
          fromWallet,
          toWallet,
          salePrice,
          txHash,
        },
      },
    });

    return { certificate: updatedCertificate, txHash };
  }

  /**
   * Verify an NFT certificate by checking on-chain ownership and
   * retrieving both on-chain and off-chain provenance data.
   */
  async verifyCertificate(certificateId: string): Promise<VerifyCertificateResult> {
    this.logger.log(`Verifying certificate: ${certificateId}`);

    const certificate = await this.prisma.nftCertificate.findUnique({
      where: { id: certificateId },
      include: {
        product: {
          include: {
            provenanceRecords: {
              orderBy: { timestamp: 'asc' },
            },
          },
        },
      },
    });

    if (!certificate) {
      throw new NotFoundException(`Certificate with ID ${certificateId} not found`);
    }

    let onChainOwner: string | null = null;
    let isValid = true;
    let onChainProvenance: ProvenanceHistoryEntry[] = [];

    const isOnChain =
      !certificate.tokenId.startsWith('offchain_') &&
      !certificate.tokenId.startsWith('pending_');

    if (this.nftContract && isOnChain) {
      try {
        onChainOwner = await this.nftContract.ownerOf(BigInt(certificate.tokenId));
        isValid = onChainOwner!.toLowerCase() === certificate.ownerWallet.toLowerCase();

        // Fetch on-chain provenance history
        const history = await this.nftContract.getProvenanceHistory(BigInt(certificate.tokenId));
        onChainProvenance = history.map((record: any) => ({
          previousOwner: record.previousOwner,
          newOwner: record.newOwner,
          salePrice: ethers.formatEther(record.salePrice),
          timestamp: Number(record.timestamp),
          notes: record.notes,
        }));
      } catch (error: any) {
        this.logger.warn(`On-chain verification failed: ${error.message}`);
        isValid = false;
      }
    } else {
      onChainOwner = certificate.ownerWallet;
    }

    let metadata: Record<string, unknown> | null = null;
    if (certificate.metadataIpfsHash) {
      try {
        const response = await fetch(
          `https://gateway.pinata.cloud/ipfs/${certificate.metadataIpfsHash}`,
        );
        if (response.ok) {
          metadata = (await response.json()) as Record<string, unknown>;
        }
      } catch (error: any) {
        this.logger.warn(`Failed to fetch IPFS metadata: ${error.message}`);
      }
    }

    const provenanceChain = certificate.product.provenanceRecords.map((record) => ({
      id: record.id,
      eventType: record.eventType,
      fromWallet: record.fromWallet,
      toWallet: record.toWallet,
      price: record.price,
      notes: record.notes,
      txHash: record.txHash,
      timestamp: record.timestamp,
    }));

    return {
      isValid,
      owner: onChainOwner,
      metadata,
      provenanceChain,
      onChainProvenance,
    };
  }

  /**
   * Get on-chain provenance history directly from the smart contract.
   */
  async getOnChainProvenance(tokenId: string): Promise<ProvenanceHistoryEntry[]> {
    if (!this.nftContract) {
      this.logger.warn('No blockchain connection available');
      return [];
    }

    try {
      const history = await this.nftContract.getProvenanceHistory(BigInt(tokenId));
      return history.map((record: any) => ({
        previousOwner: record.previousOwner,
        newOwner: record.newOwner,
        salePrice: ethers.formatEther(record.salePrice),
        timestamp: Number(record.timestamp),
        notes: record.notes,
      }));
    } catch (error: any) {
      this.logger.error(`Failed to fetch on-chain provenance: ${error.message}`);
      return [];
    }
  }

  /**
   * Record a provenance event on-chain for an existing NFT.
   */
  async recordOnChainProvenance(
    tokenId: string,
    previousOwner: string,
    newOwner: string,
    salePrice: number,
    notes: string,
  ): Promise<string | null> {
    if (!this.nftContract || !this.wallet) {
      this.logger.warn('No blockchain connection, skipping on-chain provenance');
      return null;
    }

    try {
      const priceInWei = ethers.parseEther(salePrice.toString());
      const tx = await this.nftContract.recordProvenance(
        BigInt(tokenId),
        previousOwner,
        newOwner,
        priceInWei,
        notes,
      );
      const receipt = await tx.wait();
      this.logger.log(`On-chain provenance recorded, tx: ${receipt.hash}`);
      return receipt.hash;
    } catch (error: any) {
      this.logger.error(`Failed to record on-chain provenance: ${error.message}`);
      return null;
    }
  }

  /**
   * Get contract statistics (total minted, total supply).
   */
  async getContractStats(): Promise<{ totalMinted: number; totalSupply: number } | null> {
    if (!this.nftContract) {
      return null;
    }

    try {
      const [totalMinted, totalSupply] = await Promise.all([
        this.nftContract.totalMinted(),
        this.nftContract.totalSupply(),
      ]);
      return {
        totalMinted: Number(totalMinted),
        totalSupply: Number(totalSupply),
      };
    } catch (error: any) {
      this.logger.error(`Failed to fetch contract stats: ${error.message}`);
      return null;
    }
  }

  private async uploadToIpfs(metadata: Record<string, unknown>): Promise<string> {
    const pinataApiKey = this.configService.get<string>('PINATA_API_KEY', '');
    const pinataSecret = this.configService.get<string>('PINATA_API_SECRET', '');

    if (!pinataApiKey || !pinataSecret) {
      this.logger.warn('Pinata credentials not configured, generating mock IPFS hash');
      const hash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(metadata)));
      return `Qm${hash.slice(2, 48)}`;
    }

    try {
      const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          pinata_api_key: pinataApiKey,
          pinata_secret_api_key: pinataSecret,
        },
        body: JSON.stringify({
          pinataContent: metadata,
          pinataMetadata: {
            name: `muzayede-nft-${Date.now()}`,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Pinata API error: ${response.status} - ${errorText}`);
      }

      const result = (await response.json()) as { IpfsHash: string };
      this.logger.log(`Metadata uploaded to IPFS: ${result.IpfsHash}`);
      return result.IpfsHash;
    } catch (error: any) {
      this.logger.error(`IPFS upload failed: ${error.message}`);
      const hash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(metadata)));
      return `Qm${hash.slice(2, 48)}`;
    }
  }
}
