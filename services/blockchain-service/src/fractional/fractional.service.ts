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

const FRACTIONAL_OWNERSHIP_ABI = [
  'function createListing(address nftContract, uint256 nftTokenId, uint256 totalShares, uint256 pricePerShare) external returns (uint256)',
  'function purchaseShares(uint256 listingId, uint256 shares) external payable',
  'function getListing(uint256 listingId) external view returns (tuple(address nftContract, uint256 nftTokenId, uint256 totalShares, uint256 availableShares, uint256 pricePerShare, address originalOwner, bool isActive))',
  'function balanceOf(address account, uint256 id) external view returns (uint256)',
  'event ListingCreated(uint256 indexed listingId, address nftContract, uint256 nftTokenId, uint256 totalShares, uint256 pricePerShare)',
  'event SharesPurchased(uint256 indexed listingId, address indexed buyer, uint256 shares, uint256 totalPaid)',
];

@Injectable()
export class FractionalService {
  private readonly logger = new Logger(FractionalService.name);
  private provider: ethers.JsonRpcProvider | null = null;
  private wallet: ethers.Wallet | null = null;
  private fractionalContract: ethers.Contract | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.initializeProvider();
  }

  private initializeProvider(): void {
    const rpcUrl = this.configService.get<string>('BLOCKCHAIN_RPC_URL', 'http://localhost:8545');
    const privateKey = this.configService.get<string>('BLOCKCHAIN_PRIVATE_KEY', '');
    const contractAddress = this.configService.get<string>('FRACTIONAL_CONTRACT', '');

    try {
      this.provider = new ethers.JsonRpcProvider(rpcUrl);
      if (privateKey) {
        this.wallet = new ethers.Wallet(privateKey, this.provider);
      }
      if (contractAddress && this.wallet) {
        this.fractionalContract = new ethers.Contract(
          contractAddress,
          FRACTIONAL_OWNERSHIP_ABI,
          this.wallet,
        );
      }
    } catch (error: any) {
      this.logger.warn(`Failed to initialize blockchain provider: ${error.message}`);
    }
  }

  async createFractionalToken(
    productId: string,
    totalShares: number,
    pricePerShare: number,
  ): Promise<any> {
    this.logger.log(
      `Creating fractional token: product=${productId}, shares=${totalShares}, price=${pricePerShare}`,
    );

    if (totalShares <= 0) {
      throw new BadRequestException('Total shares must be greater than 0');
    }
    if (pricePerShare <= 0) {
      throw new BadRequestException('Price per share must be greater than 0');
    }

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    const existingToken = await this.prisma.fractionalToken.findFirst({
      where: { productId, isActive: true },
    });

    if (existingToken) {
      throw new BadRequestException(
        `Product ${productId} already has an active fractional token`,
      );
    }

    let contractAddress: string | null = null;

    if (this.fractionalContract && this.wallet) {
      try {
        const nftContractAddress = this.configService.get<string>('AUCTION_NFT_CONTRACT', '');
        const certificate = await this.prisma.nftCertificate.findFirst({
          where: { productId },
          orderBy: { createdAt: 'desc' },
        });

        if (certificate && nftContractAddress) {
          const priceInWei = ethers.parseEther(pricePerShare.toString());
          const tx = await this.fractionalContract.createListing(
            nftContractAddress,
            BigInt(certificate.tokenId),
            totalShares,
            priceInWei,
          );
          const receipt = await tx.wait();
          contractAddress = await this.fractionalContract.getAddress();
          this.logger.log(`Fractional listing created on-chain, tx: ${receipt.hash}`);
        }
      } catch (error: any) {
        this.logger.warn(`On-chain fractional creation failed: ${error.message}`);
      }
    }

    const fractionalToken = await this.prisma.fractionalToken.create({
      data: {
        productId,
        contractAddress,
        totalShares,
        pricePerShare,
        availableShares: totalShares,
        currency: 'TRY',
        isActive: true,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'fractional.token.created',
        entityType: 'FractionalToken',
        entityId: fractionalToken.id,
        metadata: {
          productId,
          totalShares,
          pricePerShare,
          contractAddress,
        },
      },
    });

    return fractionalToken;
  }

  async buyShares(
    tokenId: string,
    userId: string,
    quantity: number,
  ): Promise<any> {
    this.logger.log(
      `Buying shares: token=${tokenId}, user=${userId}, quantity=${quantity}`,
    );

    if (quantity <= 0) {
      throw new BadRequestException('Quantity must be greater than 0');
    }

    const token = await this.prisma.fractionalToken.findUnique({
      where: { id: tokenId },
    });

    if (!token) {
      throw new NotFoundException(`Fractional token with ID ${tokenId} not found`);
    }

    if (!token.isActive) {
      throw new BadRequestException('This fractional token is no longer active');
    }

    if (token.availableShares < quantity) {
      throw new BadRequestException(
        `Not enough shares available. Requested: ${quantity}, Available: ${token.availableShares}`,
      );
    }

    const totalCost = Number(token.pricePerShare) * quantity;

    const updatedToken = await this.prisma.fractionalToken.update({
      where: { id: tokenId },
      data: {
        availableShares: { decrement: quantity },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'fractional.shares.purchased',
        entityType: 'FractionalToken',
        entityId: tokenId,
        metadata: {
          quantity,
          pricePerShare: Number(token.pricePerShare),
          totalCost,
          remainingShares: updatedToken.availableShares,
          productId: token.productId,
        },
      },
    });

    return {
      token: updatedToken,
      purchase: {
        userId,
        quantity,
        pricePerShare: Number(token.pricePerShare),
        totalCost,
        currency: token.currency,
      },
    };
  }

  async getShareholders(tokenId: string): Promise<
    Array<{
      userId: string;
      shares: number;
      totalInvested: number;
    }>
  > {
    this.logger.log(`Getting shareholders for token: ${tokenId}`);

    const token = await this.prisma.fractionalToken.findUnique({
      where: { id: tokenId },
    });

    if (!token) {
      throw new NotFoundException(`Fractional token with ID ${tokenId} not found`);
    }

    const purchaseLogs = await this.prisma.auditLog.findMany({
      where: {
        entityType: 'FractionalToken',
        entityId: tokenId,
        action: 'fractional.shares.purchased',
      },
      orderBy: { createdAt: 'asc' },
    });

    const shareholderMap = new Map<
      string,
      { userId: string; shares: number; totalInvested: number }
    >();

    for (const log of purchaseLogs) {
      const meta = log.metadata as any;
      if (!meta || !log.userId) continue;

      const existing = shareholderMap.get(log.userId) || {
        userId: log.userId,
        shares: 0,
        totalInvested: 0,
      };

      existing.shares += meta.quantity || 0;
      existing.totalInvested += meta.totalCost || 0;
      shareholderMap.set(log.userId, existing);
    }

    return Array.from(shareholderMap.values());
  }

  async getTokenInfo(tokenId: string): Promise<{
    token: any;
    shareholders: Array<{ userId: string; shares: number; totalInvested: number }>;
    product: any;
  }> {
    this.logger.log(`Getting token info: ${tokenId}`);

    const token = await this.prisma.fractionalToken.findUnique({
      where: { id: tokenId },
      include: {
        product: {
          include: {
            media: { where: { isPrimary: true }, take: 1 },
            category: true,
          },
        },
      },
    });

    if (!token) {
      throw new NotFoundException(`Fractional token with ID ${tokenId} not found`);
    }

    const shareholders = await this.getShareholders(tokenId);

    return {
      token: {
        id: token.id,
        productId: token.productId,
        contractAddress: token.contractAddress,
        totalShares: token.totalShares,
        availableShares: token.availableShares,
        soldShares: token.totalShares - token.availableShares,
        pricePerShare: Number(token.pricePerShare),
        totalValue: token.totalShares * Number(token.pricePerShare),
        currency: token.currency,
        isActive: token.isActive,
        createdAt: token.createdAt,
      },
      shareholders,
      product: {
        id: token.product.id,
        title: token.product.title,
        slug: token.product.slug,
        imageUrl: token.product.media[0]?.url || null,
        category: token.product.category?.name || null,
      },
    };
  }
}
