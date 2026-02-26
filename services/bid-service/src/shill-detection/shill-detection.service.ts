import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface ShillAnalysisResult {
  isSuspicious: boolean;
  confidenceScore: number;
  reason?: string;
  flags: string[];
}

@Injectable()
export class ShillDetectionService {
  private readonly logger = new Logger(ShillDetectionService.name);
  private readonly SUSPICIOUS_THRESHOLD = 0.7;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Analyze a bid for shill bidding patterns.
   * Shill bidding is when a seller or their associates place fake bids
   * to artificially inflate the auction price.
   */
  async analyze(
    auctionId: string,
    userId: string,
    amount: number,
    ipAddress?: string,
    deviceFingerprint?: string,
  ): Promise<ShillAnalysisResult> {
    const flags: string[] = [];
    let score = 0;

    // Check 1: Bidder is the seller or closely related
    const sellerRelationScore = await this.checkSellerRelation(
      auctionId,
      userId,
      ipAddress,
    );
    if (sellerRelationScore > 0) {
      flags.push('BIDDER_SELLER_RELATION');
      score += sellerRelationScore;
    }

    // Check 2: Bidder has a pattern of bidding on same seller's auctions without winning
    const patternScore = await this.analyzeBiddingPattern(auctionId, userId);
    if (patternScore > 0) {
      flags.push('REPETITIVE_LOSING_PATTERN');
      score += patternScore;
    }

    // Check 3: Device fingerprint matches other bidders on same auction
    if (deviceFingerprint) {
      const deviceScore = await this.checkDeviceFingerprint(
        auctionId,
        userId,
        deviceFingerprint,
      );
      if (deviceScore > 0) {
        flags.push('DEVICE_FINGERPRINT_MATCH');
        score += deviceScore;
      }
    }

    // Check 4: Suspicious timing patterns
    const timingScore = await this.checkTimingPattern(auctionId, userId);
    if (timingScore > 0) {
      flags.push('SUSPICIOUS_TIMING');
      score += timingScore;
    }

    // Check 5: New account with aggressive bidding behavior
    const newAccountScore = await this.checkNewAccountBehavior(userId);
    if (newAccountScore > 0) {
      flags.push('NEW_ACCOUNT_AGGRESSIVE_BIDDING');
      score += newAccountScore;
    }

    const isSuspicious = score >= this.SUSPICIOUS_THRESHOLD;

    if (isSuspicious) {
      this.logger.warn(
        `Shill bidding suspected: bidder=${userId}, auction=${auctionId}, ` +
          `score=${score.toFixed(2)}, flags=[${flags.join(', ')}]`,
      );

      // Log suspicious activity to audit
      await this.prisma.auditLog.create({
        data: {
          userId,
          action: 'shill_detection.flagged',
          entityType: 'Bid',
          entityId: auctionId,
          metadata: {
            score,
            flags,
            amount,
            ipAddress,
            deviceFingerprint,
          },
        },
      });
    }

    return {
      isSuspicious,
      confidenceScore: Math.min(score, 1),
      reason: isSuspicious
        ? `Shill bidding detected: ${flags.join(', ')}`
        : undefined,
      flags,
    };
  }

  /**
   * Check if the bidder is the auction creator/seller or shares IP with them.
   */
  async checkSellerRelation(
    auctionId: string,
    userId: string,
    ipAddress?: string,
  ): Promise<number> {
    let score = 0;

    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
      select: { createdBy: true },
    });

    if (!auction) return 0;

    // Direct match: bidder IS the seller
    if (auction.createdBy === userId) {
      return 0.9;
    }

    // Check if bidder and seller have shared IP addresses from previous bids
    if (ipAddress) {
      const sellerBidsWithSameIp = await this.prisma.bid.findFirst({
        where: {
          userId: auction.createdBy,
          ipAddress: ipAddress,
        },
      });

      if (sellerBidsWithSameIp) {
        score += 0.4;
      }
    }

    // Check if bidder has ever bid from same IP as the seller on any auction
    if (ipAddress) {
      const sellerIps = await this.prisma.bid.findMany({
        where: { userId: auction.createdBy },
        select: { ipAddress: true },
        distinct: ['ipAddress'],
      });

      const sellerIpSet = new Set(
        sellerIps.map((b) => b.ipAddress).filter(Boolean),
      );

      const bidderBidsOnSameIps = await this.prisma.bid.count({
        where: {
          userId,
          ipAddress: { in: Array.from(sellerIpSet) as string[] },
        },
      });

      if (bidderBidsOnSameIps > 0) {
        score += 0.25;
      }
    }

    return score;
  }

  /**
   * Analyze if user consistently bids on the same seller's auctions but never wins.
   */
  async analyzeBiddingPattern(
    auctionId: string,
    userId: string,
  ): Promise<number> {
    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
      select: { createdBy: true },
    });

    if (!auction) return 0;

    // Get all auctions by the same seller
    const sellerAuctions = await this.prisma.auction.findMany({
      where: {
        createdBy: auction.createdBy,
        status: { in: ['COMPLETED', 'LIVE'] },
      },
      select: { id: true },
    });

    const sellerAuctionIds = sellerAuctions.map((a) => a.id);

    if (sellerAuctionIds.length <= 1) return 0;

    // Count how many of this seller's auctions the user has bid on
    const userBidsOnSellerAuctions = await this.prisma.bid.groupBy({
      by: ['auctionId'],
      where: {
        userId,
        auctionId: { in: sellerAuctionIds },
        isRetracted: false,
      },
    });

    const auctionsBidOn = userBidsOnSellerAuctions.length;

    if (auctionsBidOn < 3) return 0;

    // Count how many the user actually won
    const auctionsWon = await this.prisma.bid.count({
      where: {
        userId,
        auctionId: { in: sellerAuctionIds },
        isRetracted: false,
        isWinning: true,
        auction: { status: 'COMPLETED' },
      },
    });

    // High bid activity but no wins: suspicious
    const winRate = auctionsBidOn > 0 ? auctionsWon / auctionsBidOn : 0;
    if (auctionsBidOn >= 5 && winRate === 0) {
      return 0.3;
    }
    if (auctionsBidOn >= 3 && winRate < 0.1) {
      return 0.2;
    }

    return 0;
  }

  /**
   * Check if the device fingerprint matches another user's bids on the same auction.
   */
  async checkDeviceFingerprint(
    auctionId: string,
    userId: string,
    fingerprint: string,
  ): Promise<number> {
    if (!fingerprint) return 0;

    // Find bids on the same auction from different users with the same fingerprint
    const matchingBids = await this.prisma.bid.findMany({
      where: {
        auctionId,
        deviceFingerprint: fingerprint,
        userId: { not: userId },
        isRetracted: false,
      },
      select: { userId: true },
      distinct: ['userId'],
    });

    if (matchingBids.length > 0) {
      this.logger.warn(
        `Device fingerprint match: user=${userId} shares fingerprint with ${matchingBids.length} other user(s) on auction=${auctionId}`,
      );
      return 0.35;
    }

    return 0;
  }

  /**
   * Analyze bid timing: if bids always come just after being outbid (< 5 seconds).
   */
  async checkTimingPattern(
    auctionId: string,
    userId: string,
  ): Promise<number> {
    // Get this user's bids on this auction, ordered by time
    const userBids = await this.prisma.bid.findMany({
      where: {
        auctionId,
        userId,
        isRetracted: false,
      },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true, id: true },
    });

    if (userBids.length < 3) return 0;

    // For each of the user's bids, find the immediately preceding bid by other users
    let quickResponseCount = 0;
    let totalResponses = 0;

    for (const userBid of userBids) {
      const precedingBid = await this.prisma.bid.findFirst({
        where: {
          auctionId,
          userId: { not: userId },
          isRetracted: false,
          createdAt: { lt: userBid.createdAt },
        },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      });

      if (precedingBid) {
        totalResponses++;
        const timeDiffMs =
          userBid.createdAt.getTime() - precedingBid.createdAt.getTime();
        if (timeDiffMs < 5000) {
          // Less than 5 seconds
          quickResponseCount++;
        }
      }
    }

    if (totalResponses === 0) return 0;

    const quickResponseRate = quickResponseCount / totalResponses;

    // If more than 60% of responses are under 5 seconds, that's suspicious
    if (quickResponseRate > 0.6 && totalResponses >= 3) {
      return 0.25;
    }

    return 0;
  }

  /**
   * Check if the account is new (< 7 days old) and has aggressive bidding.
   */
  async checkNewAccountBehavior(userId: string): Promise<number> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { createdAt: true },
    });

    if (!user) return 0;

    const accountAgeDays =
      (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24);

    if (accountAgeDays >= 7) return 0;

    // Count total bids placed by this new account
    const totalBids = await this.prisma.bid.count({
      where: {
        userId,
        isRetracted: false,
      },
    });

    // New account (< 7 days) with more than 10 bids is suspicious
    if (totalBids > 10) {
      return 0.2;
    }

    // Very new account (< 1 day) with more than 5 bids
    if (accountAgeDays < 1 && totalBids > 5) {
      return 0.25;
    }

    return 0;
  }
}
