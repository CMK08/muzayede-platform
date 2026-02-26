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

const AUCTION_NFT_ABI = [
  'function mint(address to, string memory uri, string memory auctionId) external returns (uint256)',
  'function transferFrom(address from, address to, uint256 tokenId) external',
  'function ownerOf(uint256 tokenId) external view returns (address)',
  'function tokenURI(uint256 tokenId) external view returns (string)',
  'function getProvenanceChain(uint256 tokenId) external view returns (bytes32[])',
  'function recordProvenance(uint256 tokenId, bytes32 provenanceHash) external',
  'event AuctionNFTMinted(uint256 indexed tokenId, address indexed owner, string auctionId, string metadataUri)',
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
];

interface MintCertificateResult {
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

interface VerifyCertificateResult {
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

        const mintEvent = receipt.logs.find(
          (log: any) => log.fragment?.name === 'AuctionNFTMinted',
        );
        tokenId = mintEvent
          ? mintEvent.args[0].toString()
          : receipt.logs[0]?.topics[1]
            ? parseInt(receipt.logs[0].topics[1], 16).toString()
            : Date.now().toString();
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
          : 'https://etherscan.io';

    return {
      certificate,
      ipfsUrl: `https://gateway.pinata.cloud/ipfs/${metadataIpfsHash}`,
      explorerLink: mintTxHash
        ? `${explorerBaseUrl}/tx/${mintTxHash}`
        : `${explorerBaseUrl}/token/${contractAddress}`,
    };
  }

  async transferCertificate(
    certificateId: string,
    fromWallet: string,
    toWallet: string,
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

    if (this.nftContract && this.wallet) {
      try {
        const tx = await this.nftContract.transferFrom(
          fromWallet,
          toWallet,
          BigInt(certificate.tokenId),
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
      this.logger.warn('No blockchain connection, performing off-chain transfer');
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
        txHash,
        notes: `NFT certificate transferred from ${fromWallet} to ${toWallet}`,
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
          txHash,
        },
      },
    });

    return { certificate: updatedCertificate, txHash };
  }

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

    if (this.nftContract && !certificate.tokenId.startsWith('offchain_') && !certificate.tokenId.startsWith('pending_')) {
      try {
        onChainOwner = await this.nftContract.ownerOf(BigInt(certificate.tokenId));
        isValid = onChainOwner.toLowerCase() === certificate.ownerWallet.toLowerCase();
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
    };
  }

  async getProvenanceChain(productId: string): Promise<
    Array<{
      event: string;
      from: string | null;
      to: string | null;
      price: unknown;
      date: Date;
      txHash: string | null;
      notes: string | null;
    }>
  > {
    this.logger.log(`Getting provenance chain for product: ${productId}`);

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    const records = await this.prisma.provenanceRecord.findMany({
      where: { productId },
      orderBy: { timestamp: 'asc' },
    });

    return records.map((record) => ({
      event: record.eventType,
      from: record.fromWallet,
      to: record.toWallet,
      price: record.price,
      date: record.timestamp,
      txHash: record.txHash,
      notes: record.notes,
    }));
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
