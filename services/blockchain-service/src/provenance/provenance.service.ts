import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { PrismaService } from '../prisma/prisma.service';

const AUCTION_NFT_ABI = [
  'function recordProvenance(uint256 tokenId, bytes32 provenanceHash) external',
  'function getProvenanceChain(uint256 tokenId) external view returns (bytes32[])',
];

@Injectable()
export class ProvenanceService {
  private readonly logger = new Logger(ProvenanceService.name);
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
    } catch (error: any) {
      this.logger.warn(`Failed to initialize blockchain provider: ${error.message}`);
    }
  }

  async recordEvent(
    productId: string,
    eventType: string,
    details: {
      fromWallet?: string;
      toWallet?: string;
      price?: number;
      notes?: string;
    },
  ): Promise<{
    id: string;
    productId: string;
    eventType: string;
    fromWallet: string | null;
    toWallet: string | null;
    price: unknown;
    notes: string | null;
    txHash: string | null;
    timestamp: Date;
  }> {
    this.logger.log(`Recording provenance: product=${productId}, event=${eventType}`);

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    let txHash: string | null = null;

    const certificate = await this.prisma.nftCertificate.findFirst({
      where: { productId },
      orderBy: { createdAt: 'desc' },
    });

    if (certificate && this.nftContract && this.wallet) {
      try {
        const recordData = JSON.stringify({
          productId,
          eventType,
          ...details,
          timestamp: new Date().toISOString(),
        });
        const provenanceHash = ethers.keccak256(ethers.toUtf8Bytes(recordData));

        if (!certificate.tokenId.startsWith('offchain_') && !certificate.tokenId.startsWith('pending_')) {
          const tx = await this.nftContract.recordProvenance(
            BigInt(certificate.tokenId),
            provenanceHash,
          );
          const receipt = await tx.wait();
          txHash = receipt.hash;
        }
      } catch (error: any) {
        this.logger.warn(`Blockchain provenance recording failed: ${error.message}`);
      }
    }

    const record = await this.prisma.provenanceRecord.create({
      data: {
        productId,
        eventType,
        fromWallet: details.fromWallet || null,
        toWallet: details.toWallet || null,
        price: details.price || null,
        notes: details.notes || null,
        txHash,
        timestamp: new Date(),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'provenance.event.recorded',
        entityType: 'ProvenanceRecord',
        entityId: record.id,
        metadata: {
          productId,
          eventType,
          fromWallet: details.fromWallet,
          toWallet: details.toWallet,
          txHash,
        },
      },
    });

    return record;
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

  async verifyRecord(recordId: string): Promise<{
    verified: boolean;
    blockchainHash: string | null;
    databaseRecord: any;
  }> {
    this.logger.log(`Verifying provenance record: ${recordId}`);

    const record = await this.prisma.provenanceRecord.findUnique({
      where: { id: recordId },
    });

    if (!record) {
      throw new NotFoundException(`Provenance record with ID ${recordId} not found`);
    }

    let blockchainHash: string | null = null;
    let verified = true;

    if (record.txHash && this.provider) {
      try {
        const tx = await this.provider.getTransactionReceipt(record.txHash);
        if (tx && tx.status === 1) {
          blockchainHash = record.txHash;
          verified = true;
        } else {
          verified = false;
        }
      } catch (error: any) {
        this.logger.warn(`Blockchain verification failed: ${error.message}`);
        verified = false;
      }
    } else {
      verified = record.txHash === null;
    }

    return {
      verified,
      blockchainHash,
      databaseRecord: record,
    };
  }
}
