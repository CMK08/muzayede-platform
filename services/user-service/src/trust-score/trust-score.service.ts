import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface TrustScoreBreakdown {
  userId: string;
  overallScore: number;
  components: {
    identityVerification: { score: number; weight: number; weighted: number };
    transactionHistory: { score: number; weight: number; weighted: number };
    sellerRating: { score: number; weight: number; weighted: number };
    buyerRating: { score: number; weight: number; weighted: number };
    disputeResolution: { score: number; weight: number; weighted: number };
    accountAge: { score: number; weight: number; weighted: number };
    communityStanding: { score: number; weight: number; weighted: number };
  };
  level: 'beginner' | 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  updatedAt: Date;
}

@Injectable()
export class TrustScoreService {
  private readonly logger = new Logger(TrustScoreService.name);

  private readonly WEIGHTS = {
    identityVerification: 0.20,
    transactionHistory: 0.25,
    sellerRating: 0.15,
    buyerRating: 0.15,
    disputeResolution: 0.10,
    accountAge: 0.05,
    communityStanding: 0.10,
  };

  constructor(private readonly prisma: PrismaService) {}

  async calculateTrustScore(userId: string): Promise<TrustScoreBreakdown> {
    this.logger.log(`Calculating trust score for user: ${userId}`);

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const [
      identityScore,
      transactionScore,
      sellerScore,
      buyerScore,
      disputeScore,
      accountAgeScore,
      communityScore,
    ] = await Promise.all([
      this.getIdentityVerificationScore(userId),
      this.getTransactionHistoryScore(userId),
      this.getSellerRatingScore(userId),
      this.getBuyerRatingScore(userId),
      this.getDisputeResolutionScore(userId),
      this.getAccountAgeScore(userId),
      this.getCommunityStandingScore(userId),
    ]);

    const components = {
      identityVerification: {
        score: identityScore,
        weight: this.WEIGHTS.identityVerification,
        weighted: identityScore * this.WEIGHTS.identityVerification,
      },
      transactionHistory: {
        score: transactionScore,
        weight: this.WEIGHTS.transactionHistory,
        weighted: transactionScore * this.WEIGHTS.transactionHistory,
      },
      sellerRating: {
        score: sellerScore,
        weight: this.WEIGHTS.sellerRating,
        weighted: sellerScore * this.WEIGHTS.sellerRating,
      },
      buyerRating: {
        score: buyerScore,
        weight: this.WEIGHTS.buyerRating,
        weighted: buyerScore * this.WEIGHTS.buyerRating,
      },
      disputeResolution: {
        score: disputeScore,
        weight: this.WEIGHTS.disputeResolution,
        weighted: disputeScore * this.WEIGHTS.disputeResolution,
      },
      accountAge: {
        score: accountAgeScore,
        weight: this.WEIGHTS.accountAge,
        weighted: accountAgeScore * this.WEIGHTS.accountAge,
      },
      communityStanding: {
        score: communityScore,
        weight: this.WEIGHTS.communityStanding,
        weighted: communityScore * this.WEIGHTS.communityStanding,
      },
    };

    const overallScore =
      Math.round(
        (components.identityVerification.weighted +
          components.transactionHistory.weighted +
          components.sellerRating.weighted +
          components.buyerRating.weighted +
          components.disputeResolution.weighted +
          components.accountAge.weighted +
          components.communityStanding.weighted) *
          100,
      ) / 100;

    // Update trustScore in the database
    await this.prisma.user.update({
      where: { id: userId },
      data: { trustScore: overallScore },
    });

    return {
      userId,
      overallScore,
      components,
      level: this.determineLevel(overallScore),
      updatedAt: new Date(),
    };
  }

  private determineLevel(score: number): TrustScoreBreakdown['level'] {
    if (score >= 95) return 'diamond';
    if (score >= 85) return 'platinum';
    if (score >= 70) return 'gold';
    if (score >= 50) return 'silver';
    if (score >= 30) return 'bronze';
    return 'beginner';
  }

  /**
   * Identity Verification Score (weight: 20%)
   * - KycStatus: APPROVED=100, PENDING=50, NOT_SUBMITTED=0, REJECTED=10
   * - isVerified (email verified) = +20 base bonus
   */
  private async getIdentityVerificationScore(userId: string): Promise<number> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { kycStatus: true, isVerified: true },
    });

    if (!user) return 0;

    let score = 0;

    // KYC status scoring
    switch (user.kycStatus) {
      case 'APPROVED':
        score = 100;
        break;
      case 'PENDING':
        score = 50;
        break;
      case 'REJECTED':
        score = 10;
        break;
      case 'NOT_SUBMITTED':
      default:
        score = 0;
        break;
    }

    // Email verification bonus: +20 base, but cap at 100
    if (user.isVerified) {
      score = Math.min(100, score + 20);
    }

    return score;
  }

  /**
   * Transaction History Score (weight: 25%)
   * - Count completed orders (buyer + seller)
   * - 0 orders=0, 1-5=40, 6-20=60, 21-50=80, 50+=100
   * - Factor in total transaction volume
   */
  private async getTransactionHistoryScore(userId: string): Promise<number> {
    const [buyerOrderCount, sellerOrderCount] = await Promise.all([
      this.prisma.order.count({
        where: {
          buyerId: userId,
          status: 'COMPLETED',
        },
      }),
      this.prisma.order.count({
        where: {
          sellerId: userId,
          status: 'COMPLETED',
        },
      }),
    ]);

    const totalOrders = buyerOrderCount + sellerOrderCount;

    let baseScore: number;
    if (totalOrders === 0) {
      baseScore = 0;
    } else if (totalOrders <= 5) {
      baseScore = 40;
    } else if (totalOrders <= 20) {
      baseScore = 60;
    } else if (totalOrders <= 50) {
      baseScore = 80;
    } else {
      baseScore = 100;
    }

    // Factor in transaction volume for a slight bonus
    // Aggregate total transaction amount
    const volumeAgg = await this.prisma.order.aggregate({
      where: {
        OR: [
          { buyerId: userId, status: 'COMPLETED' },
          { sellerId: userId, status: 'COMPLETED' },
        ],
      },
      _sum: { totalAmount: true },
    });

    const totalVolume = volumeAgg._sum.totalAmount
      ? Number(volumeAgg._sum.totalAmount)
      : 0;

    // Volume bonus: up to +10 points for high volume traders
    let volumeBonus = 0;
    if (totalVolume > 1_000_000) {
      volumeBonus = 10;
    } else if (totalVolume > 500_000) {
      volumeBonus = 7;
    } else if (totalVolume > 100_000) {
      volumeBonus = 5;
    } else if (totalVolume > 10_000) {
      volumeBonus = 2;
    }

    return Math.min(100, baseScore + volumeBonus);
  }

  /**
   * Seller Rating Score (weight: 15%)
   * - Query completed seller orders, calculate completion rate
   * - orders completed on time / total seller orders * 100
   */
  private async getSellerRatingScore(userId: string): Promise<number> {
    const totalSellerOrders = await this.prisma.order.count({
      where: { sellerId: userId },
    });

    if (totalSellerOrders === 0) {
      // No seller orders, neutral score
      return 50;
    }

    const completedSellerOrders = await this.prisma.order.count({
      where: {
        sellerId: userId,
        status: { in: ['COMPLETED', 'DELIVERED', 'SHIPPED'] },
      },
    });

    // Completion rate as score
    const completionRate = (completedSellerOrders / totalSellerOrders) * 100;

    // Penalize cancelled/disputed orders
    const problematicOrders = await this.prisma.order.count({
      where: {
        sellerId: userId,
        status: { in: ['CANCELLED', 'DISPUTED', 'REFUNDED'] },
      },
    });

    const problemRate = (problematicOrders / totalSellerOrders) * 100;

    // Final score: completion rate minus penalty for problematic orders
    const score = Math.max(0, completionRate - problemRate * 0.5);

    return Math.min(100, Math.round(score));
  }

  /**
   * Buyer Rating Score (weight: 15%)
   * - Query completed buyer orders, payment on time rate
   * - orders paid on time / total buyer orders * 100
   */
  private async getBuyerRatingScore(userId: string): Promise<number> {
    const totalBuyerOrders = await this.prisma.order.count({
      where: { buyerId: userId },
    });

    if (totalBuyerOrders === 0) {
      // No buyer orders, neutral score
      return 50;
    }

    // Count orders that were paid (PAID, SHIPPED, DELIVERED, COMPLETED)
    const paidOrders = await this.prisma.order.count({
      where: {
        buyerId: userId,
        status: { in: ['PAID', 'SHIPPED', 'DELIVERED', 'COMPLETED'] },
      },
    });

    // Count cancelled orders (indicating payment failure or abandonment)
    const cancelledOrders = await this.prisma.order.count({
      where: {
        buyerId: userId,
        status: { in: ['CANCELLED', 'DISPUTED'] },
      },
    });

    const paymentRate = (paidOrders / totalBuyerOrders) * 100;
    const cancelPenalty = (cancelledOrders / totalBuyerOrders) * 50;

    const score = Math.max(0, paymentRate - cancelPenalty);
    return Math.min(100, Math.round(score));
  }

  /**
   * Dispute Resolution Score (weight: 10%)
   * - Count disputed orders vs total orders
   * - 0 disputes=100, <5%=80, <10%=60, >10%=40
   */
  private async getDisputeResolutionScore(userId: string): Promise<number> {
    const totalOrders = await this.prisma.order.count({
      where: {
        OR: [{ buyerId: userId }, { sellerId: userId }],
      },
    });

    if (totalOrders === 0) {
      // No orders, perfect dispute score
      return 100;
    }

    const disputedOrders = await this.prisma.order.count({
      where: {
        OR: [{ buyerId: userId }, { sellerId: userId }],
        status: 'DISPUTED',
      },
    });

    if (disputedOrders === 0) return 100;

    const disputeRate = (disputedOrders / totalOrders) * 100;

    if (disputeRate < 5) return 80;
    if (disputeRate < 10) return 60;
    return 40;
  }

  /**
   * Account Age Score (weight: 5%)
   * - <1 month=20, 1-6 months=40, 6-12 months=60, 1-2 years=80, 2+ years=100
   */
  private async getAccountAgeScore(userId: string): Promise<number> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { createdAt: true },
    });

    if (!user) return 0;

    const now = new Date();
    const createdAt = new Date(user.createdAt);
    const diffMs = now.getTime() - createdAt.getTime();
    const diffMonths = diffMs / (1000 * 60 * 60 * 24 * 30.44); // average month length

    if (diffMonths < 1) return 20;
    if (diffMonths < 6) return 40;
    if (diffMonths < 12) return 60;
    if (diffMonths < 24) return 80;
    return 100;
  }

  /**
   * Community Standing Score (weight: 10%)
   * - Check if user has badges (+30)
   * - Auction follows count > 10 (+30)
   * - Active bidding (+40)
   */
  private async getCommunityStandingScore(userId: string): Promise<number> {
    const [badgeCount, followCount, bidCount] = await Promise.all([
      this.prisma.userBadge.count({ where: { userId } }),
      this.prisma.auctionFollow.count({ where: { userId } }),
      this.prisma.bid.count({ where: { userId } }),
    ]);

    let score = 0;

    // Has badges = +30
    if (badgeCount > 0) {
      score += 30;
    }

    // Follows more than 10 auctions = +30
    if (followCount > 10) {
      score += 30;
    }

    // Active bidding = +40 (has placed any bids)
    if (bidCount > 0) {
      score += 40;
    }

    return Math.min(100, score);
  }
}
