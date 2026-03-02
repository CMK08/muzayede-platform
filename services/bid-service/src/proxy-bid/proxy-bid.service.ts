import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BidGateway } from '../websocket/bid.gateway';
const BidType = {
  PROXY: 'PROXY' as const,
  MANUAL: 'MANUAL' as const,
};

@Injectable()
export class ProxyBidService {
  private readonly logger = new Logger(ProxyBidService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly bidGateway: BidGateway,
  ) {}

  /**
   * Set a proxy bid: the system will automatically bid on behalf of the user
   * up to their maximum amount, incrementing by the minimum required.
   */
  async setProxyBid(
    auctionId: string,
    userId: string,
    maxAmount: number,
  ): Promise<{ message: string; maxAmount: number; bidId: string }> {
    this.logger.log(
      `Setting proxy bid: auction=${auctionId}, user=${userId}, max=${maxAmount}`,
    );

    // Validate auction exists and is active
    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
      include: { increments: true },
    });

    if (!auction) {
      throw new NotFoundException('Auction not found');
    }

    if (auction.status !== 'LIVE') {
      throw new BadRequestException('Auction is not currently accepting bids');
    }

    if (auction.createdBy === userId) {
      throw new BadRequestException('You cannot set proxy bids on your own auction');
    }

    const currentPrice = auction.currentPrice
      ? Number(auction.currentPrice)
      : Number(auction.startPrice);

    if (maxAmount <= currentPrice) {
      throw new BadRequestException(
        `Maximum proxy amount must be greater than the current price of ${currentPrice}`,
      );
    }

    // Check for existing active proxy bid by this user on this auction
    const existingProxy = await this.prisma.bid.findFirst({
      where: {
        auctionId,
        userId,
        type: BidType.PROXY,
        isRetracted: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existingProxy) {
      // Update existing proxy bid
      await this.prisma.bid.update({
        where: { id: existingProxy.id },
        data: {
          isRetracted: true,
          retractedReason: 'Replaced by new proxy bid',
        },
      });
    }

    // Determine the initial bid amount
    const minIncrement = this.getMinIncrement(auction, currentPrice);
    const highestBid = await this.prisma.bid.findFirst({
      where: {
        auctionId,
        isRetracted: false,
      },
      orderBy: { amount: 'desc' },
    });

    let initialBidAmount: number;
    if (!highestBid || highestBid.userId === userId) {
      // No bids or user is already highest bidder - just set the proxy
      initialBidAmount = highestBid
        ? Number(highestBid.amount)
        : Number(auction.startPrice);
    } else {
      // Place an initial bid at current + minIncrement
      initialBidAmount = Number(highestBid.amount) + minIncrement;
    }

    // Ensure initial bid doesn't exceed maxAmount
    if (initialBidAmount > maxAmount) {
      initialBidAmount = maxAmount;
    }

    // Mark previous winning bid as not winning
    if (highestBid && highestBid.isWinning && highestBid.userId !== userId) {
      await this.prisma.bid.update({
        where: { id: highestBid.id },
        data: { isWinning: false },
      });
    }

    // Create the proxy bid record
    const proxyBid = await this.prisma.bid.create({
      data: {
        auctionId,
        userId,
        amount: initialBidAmount,
        type: BidType.PROXY,
        maxProxyAmount: maxAmount,
        isWinning: true,
        isRetracted: false,
      },
    });

    // Update auction current price
    await this.prisma.auction.update({
      where: { id: auctionId },
      data: {
        currentPrice: initialBidAmount,
        bidCount: { increment: 1 },
      },
    });

    // Broadcast the proxy bid
    this.bidGateway.broadcastBid(auctionId, {
      bidId: proxyBid.id,
      amount: initialBidAmount,
      bidderId: userId,
      timestamp: proxyBid.createdAt,
    });

    // Notify outbid user
    if (highestBid && highestBid.userId !== userId) {
      this.bidGateway.notifyUser(highestBid.userId, 'outbid', {
        auctionId,
        previousAmount: Number(highestBid.amount),
        newAmount: initialBidAmount,
      });
    }

    return {
      message: 'Proxy bid configured successfully',
      maxAmount,
      bidId: proxyBid.id,
    };
  }

  /**
   * When a new bid is placed, check if any proxy bids should respond.
   * Automatically places bids for proxy bidders whose max exceeds the new amount.
   */
  async processProxyBids(
    auctionId: string,
    currentAmount: number,
    currentBidderId: string,
  ): Promise<void> {
    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
      include: { increments: true },
    });

    if (!auction) return;

    const minIncrement = this.getMinIncrement(auction, currentAmount);

    // Find all active proxy bids for this auction (not the current bidder's)
    const proxyBids = await this.prisma.bid.findMany({
      where: {
        auctionId,
        type: BidType.PROXY,
        isRetracted: false,
        maxProxyAmount: { not: null },
        userId: { not: currentBidderId },
      },
      orderBy: { maxProxyAmount: 'desc' },
    });

    if (proxyBids.length === 0) return;

    // Filter to only proxy bids that can still outbid
    const eligibleProxies = proxyBids.filter(
      (pb: any) => Number(pb.maxProxyAmount) >= currentAmount + minIncrement,
    );

    if (eligibleProxies.length === 0) return;

    // If multiple proxies compete, find the two highest
    if (eligibleProxies.length >= 2) {
      await this.resolveCompetingProxies(
        auctionId,
        eligibleProxies,
        currentAmount,
        minIncrement,
      );
    } else {
      // Single proxy: place a bid at currentAmount + minIncrement
      const proxy = eligibleProxies[0];
      const nextBidAmount = currentAmount + minIncrement;

      if (nextBidAmount <= Number(proxy.maxProxyAmount)) {
        await this.placeProxyBidRecord(
          auctionId,
          proxy.userId,
          nextBidAmount,
          Number(proxy.maxProxyAmount),
        );
      }
    }
  }

  /**
   * Cancel a user's proxy bid on an auction.
   */
  async cancelProxyBid(
    auctionId: string,
    userId: string,
  ): Promise<{ message: string }> {
    const proxyBid = await this.prisma.bid.findFirst({
      where: {
        auctionId,
        userId,
        type: BidType.PROXY,
        isRetracted: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!proxyBid) {
      throw new NotFoundException('No active proxy bid found for this auction');
    }

    await this.prisma.bid.update({
      where: { id: proxyBid.id },
      data: {
        isRetracted: true,
        retractedReason: 'Cancelled by user',
      },
    });

    this.logger.log(
      `Proxy bid cancelled: user=${userId}, auction=${auctionId}`,
    );

    return { message: 'Proxy bid cancelled successfully' };
  }

  /**
   * Resolve competing proxy bids by incrementally bidding until one runs out.
   */
  private async resolveCompetingProxies(
    auctionId: string,
    proxies: any[],
    currentAmount: number,
    minIncrement: number,
  ): Promise<void> {
    // Sort by maxProxyAmount DESC
    const sorted = proxies.sort(
      (a, b) => Number(b.maxProxyAmount) - Number(a.maxProxyAmount),
    );
    const highest = sorted[0];
    const secondHighest = sorted[1];

    const secondMax = Number(secondHighest.maxProxyAmount);
    const highestMax = Number(highest.maxProxyAmount);

    // The winning proxy bids at secondMax + minIncrement (or their max if equal)
    let winningAmount: number;
    if (highestMax === secondMax) {
      // Tie goes to the earlier bid
      winningAmount = highestMax;
    } else {
      winningAmount = Math.min(secondMax + minIncrement, highestMax);
    }

    // Ensure winning amount is above current
    winningAmount = Math.max(winningAmount, currentAmount + minIncrement);

    await this.placeProxyBidRecord(
      auctionId,
      highest.userId,
      winningAmount,
      highestMax,
    );
  }

  /**
   * Place a proxy bid record in the database and broadcast.
   */
  private async placeProxyBidRecord(
    auctionId: string,
    userId: string,
    amount: number,
    maxProxyAmount: number,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx: any) => {
      // Mark current winning bid as not winning
      await tx.bid.updateMany({
        where: {
          auctionId,
          isWinning: true,
          isRetracted: false,
        },
        data: { isWinning: false },
      });

      // Create the new proxy-triggered bid
      const newBid = await tx.bid.create({
        data: {
          auctionId,
          userId,
          amount: amount,
          type: BidType.PROXY,
          maxProxyAmount: maxProxyAmount,
          isWinning: true,
          isRetracted: false,
        },
      });

      // Update auction
      await tx.auction.update({
        where: { id: auctionId },
        data: {
          currentPrice: amount,
          bidCount: { increment: 1 },
        },
      });

      // Broadcast the proxy-placed bid
      this.bidGateway.broadcastBid(auctionId, {
        bidId: newBid.id,
        amount,
        bidderId: userId,
        timestamp: newBid.createdAt,
      });

      this.logger.log(
        `Proxy bid placed: user=${userId}, amount=${amount}, auction=${auctionId}`,
      );
    });
  }

  private getMinIncrement(auction: any, currentPrice: number): number {
    if (auction.increments && auction.increments.length > 0) {
      const applicable = auction.increments.find(
        (inc: any) =>
          currentPrice >= Number(inc.priceFrom) &&
          currentPrice < Number(inc.priceTo),
      );
      if (applicable) {
        return Number(applicable.incrementAmount);
      }
    }
    return Number(auction.minIncrement);
  }
}
