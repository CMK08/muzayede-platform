import {
  Injectable,
  Logger,
  BadRequestException,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProxyBidService } from '../proxy-bid/proxy-bid.service';
import { ShillDetectionService } from '../shill-detection/shill-detection.service';
import { BidGateway } from '../websocket/bid.gateway';
import { PlaceBidDto, BidQueryDto, UserBidQueryDto } from './dto/place-bid.dto';
// Local type aliases to avoid Prisma generated type mismatches
type AuctionStatus = string;
type AuctionType = string;
type BidType = string;

const AuctionStatus = {
  LIVE: 'LIVE' as AuctionStatus,
  PRE_BID: 'PRE_BID' as AuctionStatus,
  COMPLETED: 'COMPLETED' as AuctionStatus,
  ARCHIVED: 'ARCHIVED' as AuctionStatus,
};

const AuctionType = {
  ENGLISH: 'ENGLISH' as AuctionType,
  SEALED_BID: 'SEALED_BID' as AuctionType,
  VICKREY: 'VICKREY' as AuctionType,
  TIMED: 'TIMED' as AuctionType,
  HYBRID: 'HYBRID' as AuctionType,
};

const BidType = {
  MANUAL: 'MANUAL' as BidType,
  PROXY: 'PROXY' as BidType,
  BUY_NOW: 'BUY_NOW' as BidType,
};

@Injectable()
export class BidService {
  private readonly logger = new Logger(BidService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly proxyBidService: ProxyBidService,
    private readonly shillDetectionService: ShillDetectionService,
    private readonly bidGateway: BidGateway,
  ) {}

  async placeBid(
    dto: PlaceBidDto,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
    deviceFingerprint?: string,
  ): Promise<any> {
    this.logger.log(
      `Bid attempt: auction=${dto.auctionId}, user=${userId}, amount=${dto.amount}`,
    );

    // 1. Validate auction exists and is live
    const auction = await this.prisma.auction.findUnique({
      where: { id: dto.auctionId },
      include: { increments: true },
    });

    if (!auction) {
      throw new NotFoundException('Auction not found');
    }

    const allowedStatuses: AuctionStatus[] = [AuctionStatus.LIVE];
    if (
      auction.type === AuctionType.SEALED_BID ||
      auction.type === AuctionType.VICKREY
    ) {
      allowedStatuses.push(AuctionStatus.PRE_BID);
    }

    if (!allowedStatuses.includes(auction.status)) {
      throw new BadRequestException(
        `Auction is not accepting bids. Current status: ${auction.status}`,
      );
    }

    // 2. Validate user is not the auction creator/seller
    if (auction.createdBy === userId) {
      throw new ForbiddenException('You cannot bid on your own auction');
    }

    // 3. Check user is not blacklisted
    const blacklistEntry = await this.prisma.userBlacklist.findFirst({
      where: {
        userId,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
    });

    if (blacklistEntry) {
      throw new ForbiddenException('Your account is currently restricted from bidding');
    }

    // 4. Get current highest bid
    const currentHighestBid = await this.prisma.bid.findFirst({
      where: {
        auctionId: dto.auctionId,
        isRetracted: false,
      },
      orderBy: { amount: 'desc' },
    });

    const currentHighestAmount = currentHighestBid
      ? Number(currentHighestBid.amount)
      : Number(auction.startPrice);

    const bidAmount = dto.amount;

    // 5. Validate bid amount based on auction type
    if (
      auction.type === AuctionType.ENGLISH ||
      auction.type === AuctionType.TIMED ||
      auction.type === AuctionType.HYBRID
    ) {
      const minIncrement = this.getMinIncrement(auction, currentHighestAmount);

      if (currentHighestBid) {
        const requiredMin = currentHighestAmount + minIncrement;
        if (dto.amount < requiredMin) {
          throw new ConflictException(
            `Bid must be at least ${requiredMin.toFixed(2)} (current: ${currentHighestAmount.toFixed(2)} + increment: ${minIncrement.toFixed(2)})`,
          );
        }
      } else {
        if (dto.amount < Number(auction.startPrice)) {
          throw new BadRequestException(
            `Bid must be at least the starting price of ${auction.startPrice}`,
          );
        }
      }
    }

    // 6. BUY_NOW validation
    if (dto.type === 'BUY_NOW') {
      if (!auction.buyNowEnabled) {
        throw new BadRequestException('Buy Now is not enabled for this auction');
      }
      if (!auction.buyNowPrice || dto.amount < Number(auction.buyNowPrice)) {
        throw new BadRequestException(
          `Buy Now requires at least ${auction.buyNowPrice} ${auction.currency}`,
        );
      }
    }

    // 7. Shill detection
    const shillResult = await this.shillDetectionService.analyze(
      dto.auctionId,
      userId,
      dto.amount,
      ipAddress,
      deviceFingerprint,
    );

    if (shillResult.isSuspicious && shillResult.confidenceScore >= 0.85) {
      this.logger.warn(
        `Bid REJECTED due to shill detection: user=${userId}, score=${shillResult.confidenceScore}`,
      );
      throw new BadRequestException('Bid rejected due to suspicious activity');
    }

    // 8. Create bid in a transaction
    const bidType: BidType = (dto.type as BidType) || BidType.MANUAL;

    const createdBid = await this.prisma.$transaction(async (tx: any) => {
      // Mark previous winning bid as no longer winning
      if (currentHighestBid && currentHighestBid.isWinning) {
        await tx.bid.update({
          where: { id: currentHighestBid.id },
          data: { isWinning: false },
        });
      }

      // Insert the new bid
      const newBid = await tx.bid.create({
        data: {
          auctionId: dto.auctionId,
          userId,
          amount: bidAmount,
          type: bidType,
          maxProxyAmount: dto.maxProxyAmount || null,
          lotId: dto.lotId || null,
          ipAddress: ipAddress || null,
          userAgent: userAgent || null,
          deviceFingerprint: deviceFingerprint || null,
          isSuspicious: shillResult.isSuspicious,
          isWinning: true,
          isRetracted: false,
        },
      });

      // Update auction.currentPrice and bidCount
      await tx.auction.update({
        where: { id: dto.auctionId },
        data: {
          currentPrice: bidAmount,
          bidCount: { increment: 1 },
        },
      });

      // Anti-snipe check: if bid is within antiSnipeMinutes of endDate, extend
      const effectiveEndDate = auction.actualEndDate || auction.endDate;
      const now = new Date();
      const msUntilEnd = effectiveEndDate.getTime() - now.getTime();
      const antiSnipeMs = auction.antiSnipeMinutes * 60 * 1000;

      if (msUntilEnd > 0 && msUntilEnd <= antiSnipeMs) {
        const extensionMs = auction.antiSnipeExtension * 60 * 1000;
        const newEndDate = new Date(effectiveEndDate.getTime() + extensionMs);

        await tx.auction.update({
          where: { id: dto.auctionId },
          data: { actualEndDate: newEndDate },
        });

        this.logger.log(
          `Anti-snipe triggered: auction=${dto.auctionId}, extended to ${newEndDate.toISOString()}`,
        );

        // Broadcast anti-snipe extension
        this.bidGateway.broadcastAuctionUpdate(dto.auctionId, {
          type: 'ANTI_SNIPE_EXTENSION',
          newEndDate: newEndDate.toISOString(),
          extensionMinutes: auction.antiSnipeExtension,
        });
      }

      return newBid;
    });

    // 9. Check if reserve price is met
    if (auction.reservePrice && !auction.reserveMet) {
      if (dto.amount >= Number(auction.reservePrice)) {
        await this.prisma.auction.update({
          where: { id: dto.auctionId },
          data: { reserveMet: true },
        });
        this.logger.log(`Reserve price met for auction: ${dto.auctionId}`);

        this.bidGateway.broadcastAuctionUpdate(dto.auctionId, {
          type: 'RESERVE_MET',
          reserveMet: true,
        });
      }
    }

    // 10. Broadcast bid via WebSocket
    this.bidGateway.broadcastBid(dto.auctionId, {
      bidId: createdBid.id,
      amount: Number(createdBid.amount),
      bidderId: userId,
      timestamp: createdBid.createdAt,
    });

    // 11. Notify outbid user
    if (currentHighestBid && currentHighestBid.userId !== userId) {
      this.bidGateway.notifyUser(currentHighestBid.userId, 'outbid', {
        auctionId: dto.auctionId,
        previousAmount: Number(currentHighestBid.amount),
        newAmount: dto.amount,
        bidId: createdBid.id,
      });
    }

    // 12. Trigger proxy bid processing
    await this.proxyBidService.processProxyBids(
      dto.auctionId,
      dto.amount,
      userId,
    );

    this.logger.log(`Bid placed successfully: ${createdBid.id}`);
    return createdBid;
  }

  async getAuctionBids(
    auctionId: string,
    query: BidQueryDto,
    requestingUserId?: string,
  ) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    // Check auction type for sealed/vickrey visibility rules
    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
    });

    if (!auction) {
      throw new NotFoundException('Auction not found');
    }

    const isSealedType =
      auction.type === AuctionType.SEALED_BID ||
      auction.type === AuctionType.VICKREY;
    const isAuctionEnded =
      auction.status === AuctionStatus.COMPLETED ||
      auction.status === AuctionStatus.ARCHIVED;

    // For sealed/vickrey auctions that haven't ended, only show user's own bids
    let whereClause: any = {
      auctionId,
      isRetracted: false,
    };

    if (isSealedType && !isAuctionEnded && requestingUserId) {
      whereClause = {
        ...whereClause,
        userId: requestingUserId,
      };
    }

    const sortField = query.sortBy === 'amount' ? 'amount' : 'createdAt';
    const sortDirection = query.sortOrder || 'desc';

    const [bids, total] = await Promise.all([
      this.prisma.bid.findMany({
        where: whereClause,
        orderBy: { [sortField]: sortDirection },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              profile: {
                select: { displayName: true, firstName: true, lastName: true },
              },
            },
          },
        },
      }),
      this.prisma.bid.count({ where: whereClause }),
    ]);

    // Mask user display names
    const maskedBids = bids.map((bid: any) => {
      const displayName = this.maskDisplayName(bid.user);
      return {
        id: bid.id,
        auctionId: bid.auctionId,
        amount: Number(bid.amount),
        type: bid.type,
        isWinning: bid.isWinning,
        createdAt: bid.createdAt,
        bidder: {
          id: bid.userId,
          displayName,
        },
      };
    });

    return {
      data: maskedBids,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getHighestBid(auctionId: string) {
    const bid = await this.prisma.bid.findFirst({
      where: {
        auctionId,
        isRetracted: false,
        isWinning: true,
      },
    });

    if (!bid) {
      // Fallback: order by amount
      const fallback = await this.prisma.bid.findFirst({
        where: {
          auctionId,
          isRetracted: false,
        },
        orderBy: { amount: 'desc' },
      });
      return fallback
        ? { ...fallback, amount: Number(fallback.amount) }
        : null;
    }

    return { ...bid, amount: Number(bid.amount) };
  }

  async getUserBids(userId: string, query: UserBidQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;
    const filter = query.filter || 'all';

    let whereClause: any = {
      userId,
      isRetracted: false,
    };

    if (filter === 'active') {
      whereClause = {
        ...whereClause,
        auction: {
          status: AuctionStatus.LIVE,
        },
      };
    } else if (filter === 'won') {
      whereClause = {
        ...whereClause,
        isWinning: true,
        auction: {
          status: AuctionStatus.COMPLETED,
        },
      };
    }

    const [bids, total] = await Promise.all([
      this.prisma.bid.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          auction: {
            select: {
              id: true,
              title: true,
              status: true,
              currentPrice: true,
              endDate: true,
              actualEndDate: true,
              coverImageUrl: true,
              currency: true,
            },
          },
        },
      }),
      this.prisma.bid.count({ where: whereClause }),
    ]);

    const mappedBids = bids.map((bid: any) => ({
      id: bid.id,
      auctionId: bid.auctionId,
      amount: Number(bid.amount),
      type: bid.type,
      isWinning: bid.isWinning,
      createdAt: bid.createdAt,
      auction: {
        id: bid.auction.id,
        title: bid.auction.title,
        status: bid.auction.status,
        currentPrice: bid.auction.currentPrice
          ? Number(bid.auction.currentPrice)
          : null,
        endDate: bid.auction.actualEndDate || bid.auction.endDate,
        coverImageUrl: bid.auction.coverImageUrl,
        currency: bid.auction.currency,
      },
    }));

    return {
      data: mappedBids,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async retractBid(bidId: string, userId: string, reason: string) {
    const bid = await this.prisma.bid.findUnique({
      where: { id: bidId },
      include: { auction: true },
    });

    if (!bid) {
      throw new NotFoundException('Bid not found');
    }

    if (bid.userId !== userId) {
      throw new ForbiddenException('You can only retract your own bids');
    }

    if (bid.isRetracted) {
      throw new BadRequestException('Bid is already retracted');
    }

    // Only allow retraction within 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    if (bid.createdAt < fiveMinutesAgo) {
      throw new BadRequestException(
        'Bids can only be retracted within 5 minutes of placement',
      );
    }

    const retractedBid = await this.prisma.$transaction(async (tx: any) => {
      // Set bid as retracted
      const updated = await tx.bid.update({
        where: { id: bidId },
        data: {
          isRetracted: true,
          isWinning: false,
          retractedReason: reason,
        },
      });

      // Find the new highest bid
      const newHighestBid = await tx.bid.findFirst({
        where: {
          auctionId: bid.auctionId,
          isRetracted: false,
          id: { not: bidId },
        },
        orderBy: { amount: 'desc' },
      });

      if (newHighestBid) {
        // Set new highest bid as winning
        await tx.bid.update({
          where: { id: newHighestBid.id },
          data: { isWinning: true },
        });

        // Update auction current price
        await tx.auction.update({
          where: { id: bid.auctionId },
          data: {
            currentPrice: newHighestBid.amount,
            bidCount: { decrement: 1 },
          },
        });
      } else {
        // No more bids, revert to start price
        await tx.auction.update({
          where: { id: bid.auctionId },
          data: {
            currentPrice: bid.auction.startPrice,
            bidCount: { decrement: 1 },
          },
        });
      }

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId,
          action: 'bid.retracted',
          entityType: 'Bid',
          entityId: bidId,
          metadata: {
            reason,
            amount: Number(bid.amount),
            auctionId: bid.auctionId,
            newHighestBidId: newHighestBid?.id || null,
            newHighestAmount: newHighestBid
              ? Number(newHighestBid.amount)
              : null,
          },
          ipAddress: bid.ipAddress,
          userAgent: bid.userAgent,
        },
      });

      return updated;
    });

    // Broadcast the retraction
    this.bidGateway.broadcastAuctionUpdate(bid.auctionId, {
      type: 'BID_RETRACTED',
      bidId,
      newCurrentPrice: retractedBid
        ? Number(
            (
              await this.prisma.auction.findUnique({
                where: { id: bid.auctionId },
              })
            )?.currentPrice || 0,
          )
        : null,
    });

    this.logger.log(`Bid retracted: ${bidId}, reason: ${reason}`);
    return { message: 'Bid retracted successfully', bidId };
  }

  async setupProxyBid(auctionId: string, userId: string, maxAmount: number) {
    return this.proxyBidService.setProxyBid(auctionId, userId, maxAmount);
  }

  async cancelProxyBid(auctionId: string, userId: string) {
    return this.proxyBidService.cancelProxyBid(auctionId, userId);
  }

  private getMinIncrement(
    auction: { minIncrement: any; increments: any[] },
    currentPrice: number,
  ): number {
    // Check if there are tiered increments
    if (auction.increments && auction.increments.length > 0) {
      const applicableIncrement = auction.increments.find(
        (inc: any) =>
          currentPrice >= Number(inc.priceFrom) &&
          currentPrice < Number(inc.priceTo),
      );
      if (applicableIncrement) {
        return Number(applicableIncrement.incrementAmount);
      }
    }
    return Number(auction.minIncrement);
  }

  private maskDisplayName(user: any): string {
    const profile = user?.profile;
    const name =
      profile?.displayName ||
      (profile?.firstName && profile?.lastName
        ? `${profile.firstName} ${profile.lastName}`
        : null);

    if (!name || name.length < 2) {
      return 'A***';
    }

    const first = name.charAt(0);
    const last = name.charAt(name.length - 1);
    return `${first}***${last}`;
  }
}
