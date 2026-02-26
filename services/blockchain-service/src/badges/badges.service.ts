import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { PrismaService } from '../prisma/prisma.service';

const COLLECTOR_BADGE_ABI = [
  'function awardBadge(address to, string memory uri, string memory badgeType, string memory name, string memory rarity) external returns (uint256)',
  'function hasBadge(address user, string memory badgeType) external view returns (bool)',
  'function getBadgeInfo(uint256 tokenId) external view returns (tuple(string badgeType, string name, string rarity, uint256 awardedAt))',
  'event BadgeAwarded(uint256 indexed tokenId, address indexed recipient, string badgeType, string name, string rarity)',
];

interface BadgeTierConfig {
  type: 'BRONZE' | 'SILVER' | 'GOLD' | 'DIAMOND';
  name: string;
  description: string;
  rarity: string;
  imageUrl: string;
  criteria: {
    minPurchases?: number;
    minTotalSpend?: number;
  };
}

const BADGE_TIERS: BadgeTierConfig[] = [
  {
    type: 'BRONZE',
    name: 'Bronz Koleksiyoner',
    description: '5 veya daha fazla basarili alisveris yapan kullanicilar icin',
    rarity: 'common',
    imageUrl: '/badges/bronze-collector.png',
    criteria: { minPurchases: 5 },
  },
  {
    type: 'SILVER',
    name: 'Gumus Koleksiyoner',
    description: '20+ alisveris veya 50.000 TL+ toplam harcama',
    rarity: 'uncommon',
    imageUrl: '/badges/silver-collector.png',
    criteria: { minPurchases: 20, minTotalSpend: 50000 },
  },
  {
    type: 'GOLD',
    name: 'Altin Koleksiyoner',
    description: '50+ alisveris veya 200.000 TL+ toplam harcama',
    rarity: 'rare',
    imageUrl: '/badges/gold-collector.png',
    criteria: { minPurchases: 50, minTotalSpend: 200000 },
  },
  {
    type: 'DIAMOND',
    name: 'Elmas Koleksiyoner',
    description: '100+ alisveris veya 1.000.000 TL+ toplam harcama',
    rarity: 'legendary',
    imageUrl: '/badges/diamond-collector.png',
    criteria: { minPurchases: 100, minTotalSpend: 1000000 },
  },
];

@Injectable()
export class BadgesService {
  private readonly logger = new Logger(BadgesService.name);
  private provider: ethers.JsonRpcProvider | null = null;
  private wallet: ethers.Wallet | null = null;
  private badgeContract: ethers.Contract | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.initializeProvider();
  }

  private initializeProvider(): void {
    const rpcUrl = this.configService.get<string>('BLOCKCHAIN_RPC_URL', 'http://localhost:8545');
    const privateKey = this.configService.get<string>('BLOCKCHAIN_PRIVATE_KEY', '');
    const contractAddress = this.configService.get<string>('BADGE_CONTRACT', '');

    try {
      this.provider = new ethers.JsonRpcProvider(rpcUrl);
      if (privateKey) {
        this.wallet = new ethers.Wallet(privateKey, this.provider);
      }
      if (contractAddress && this.wallet) {
        this.badgeContract = new ethers.Contract(
          contractAddress,
          COLLECTOR_BADGE_ABI,
          this.wallet,
        );
      }
    } catch (error: any) {
      this.logger.warn(`Failed to initialize blockchain provider: ${error.message}`);
    }
  }

  async awardBadge(
    userId: string,
    badgeType: 'BRONZE' | 'SILVER' | 'GOLD' | 'DIAMOND',
  ): Promise<any> {
    this.logger.log(`Awarding ${badgeType} badge to user: ${userId}`);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const existingBadge = await this.prisma.userBadge.findUnique({
      where: {
        userId_badgeType: { userId, badgeType },
      },
    });

    if (existingBadge) {
      throw new ConflictException(
        `User ${userId} already has a ${badgeType} badge`,
      );
    }

    const tierConfig = BADGE_TIERS.find((t) => t.type === badgeType);
    if (!tierConfig) {
      throw new NotFoundException(`Badge type ${badgeType} not found`);
    }

    const userStats = await this.getUserStats(userId);
    if (!this.isEligible(tierConfig, userStats)) {
      throw new ConflictException(
        `User ${userId} does not meet the criteria for ${badgeType} badge. ` +
          `Purchases: ${userStats.totalPurchases}, Total spend: ${userStats.totalSpend} TL`,
      );
    }

    let tokenId: string | null = null;
    let txHash: string | null = null;

    if (this.badgeContract && this.wallet) {
      try {
        const metadataUri = `ipfs://badge-metadata-${badgeType.toLowerCase()}-${userId}`;
        const tx = await this.badgeContract.awardBadge(
          user.id,
          metadataUri,
          badgeType,
          tierConfig.name,
          tierConfig.rarity,
        );
        const receipt = await tx.wait();
        txHash = receipt.hash;

        const badgeEvent = receipt.logs.find(
          (log: any) => log.fragment?.name === 'BadgeAwarded',
        );
        tokenId = badgeEvent
          ? badgeEvent.args[0].toString()
          : `soulbound_${Date.now()}`;
      } catch (error: any) {
        this.logger.warn(`Blockchain badge minting failed: ${error.message}`);
        tokenId = `offchain_badge_${Date.now()}`;
      }
    } else {
      tokenId = `offchain_badge_${Date.now()}`;
    }

    const badge = await this.prisma.userBadge.create({
      data: {
        userId,
        badgeType,
        tokenId,
        txHash,
        earnedAt: new Date(),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'badge.awarded',
        entityType: 'UserBadge',
        entityId: badge.id,
        metadata: {
          badgeType,
          tokenId,
          txHash,
          tierName: tierConfig.name,
          rarity: tierConfig.rarity,
        },
      },
    });

    return {
      ...badge,
      name: tierConfig.name,
      description: tierConfig.description,
      rarity: tierConfig.rarity,
      imageUrl: tierConfig.imageUrl,
    };
  }

  async checkAndAwardBadges(userId: string): Promise<any[]> {
    this.logger.log(`Checking and awarding badges for user: ${userId}`);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const userStats = await this.getUserStats(userId);

    const existingBadges = await this.prisma.userBadge.findMany({
      where: { userId },
    });
    const existingTypes = new Set(existingBadges.map((b) => b.badgeType));

    const awardedBadges: any[] = [];

    for (const tier of BADGE_TIERS) {
      if (existingTypes.has(tier.type)) {
        continue;
      }

      if (this.isEligible(tier, userStats)) {
        try {
          const badge = await this.awardBadge(userId, tier.type);
          awardedBadges.push(badge);
          this.logger.log(`Awarded ${tier.type} badge to user ${userId}`);
        } catch (error: any) {
          this.logger.warn(
            `Failed to award ${tier.type} badge to user ${userId}: ${error.message}`,
          );
        }
      }
    }

    return awardedBadges;
  }

  async getUserBadges(userId: string): Promise<any[]> {
    this.logger.log(`Getting badges for user: ${userId}`);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const badges = await this.prisma.userBadge.findMany({
      where: { userId },
      orderBy: { earnedAt: 'asc' },
    });

    return badges.map((badge) => {
      const tierConfig = BADGE_TIERS.find((t) => t.type === badge.badgeType);
      return {
        id: badge.id,
        userId: badge.userId,
        badgeType: badge.badgeType,
        tokenId: badge.tokenId,
        txHash: badge.txHash,
        earnedAt: badge.earnedAt,
        name: tierConfig?.name || badge.badgeType,
        description: tierConfig?.description || '',
        rarity: tierConfig?.rarity || 'common',
        imageUrl: tierConfig?.imageUrl || '',
      };
    });
  }

  private async getUserStats(
    userId: string,
  ): Promise<{ totalPurchases: number; totalSpend: number }> {
    const completedOrders = await this.prisma.order.findMany({
      where: {
        buyerId: userId,
        status: 'COMPLETED',
      },
      select: {
        totalAmount: true,
      },
    });

    const totalPurchases = completedOrders.length;
    const totalSpend = completedOrders.reduce(
      (sum, order) => sum + Number(order.totalAmount),
      0,
    );

    return { totalPurchases, totalSpend };
  }

  private isEligible(
    tier: BadgeTierConfig,
    stats: { totalPurchases: number; totalSpend: number },
  ): boolean {
    const meetsPurchases =
      tier.criteria.minPurchases !== undefined &&
      stats.totalPurchases >= tier.criteria.minPurchases;

    const meetsSpend =
      tier.criteria.minTotalSpend !== undefined &&
      stats.totalSpend >= tier.criteria.minTotalSpend;

    if (tier.type === 'BRONZE') {
      return meetsPurchases;
    }

    return meetsPurchases || meetsSpend;
  }
}
