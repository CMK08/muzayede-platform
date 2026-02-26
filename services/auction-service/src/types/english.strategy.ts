import { Injectable } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import {
  AuctionType,
  AuctionTypeStrategy,
  BidContext,
  BidValidationResult,
  AuctionResult,
} from './auction-type.interface';

@Injectable()
export class EnglishAuctionStrategy implements AuctionTypeStrategy {
  readonly type = AuctionType.ENGLISH;

  validateBid(context: BidContext): BidValidationResult {
    if (context.bidderId === context.sellerId) {
      return { valid: false, reason: 'Seller cannot bid on their own auction' };
    }

    if (context.auctionStatus !== 'LIVE') {
      return { valid: false, reason: 'Auction is not currently live' };
    }

    if (context.bidAmount <= context.currentPrice) {
      return {
        valid: false,
        reason: `Bid must be higher than current price of ${context.currentPrice}`,
      };
    }

    const minimumBid = context.currentPrice + context.minIncrement;
    if (context.bidAmount < minimumBid) {
      return {
        valid: false,
        reason: `Bid must be at least ${minimumBid} (current: ${context.currentPrice} + increment: ${context.minIncrement})`,
      };
    }

    return { valid: true };
  }

  calculateNewPrice(context: BidContext): number {
    return context.bidAmount;
  }

  determineWinner(
    auctionId: string,
    bids: Array<{
      id: string;
      userId: string;
      amount: Decimal;
      createdAt: Date;
      isRetracted: boolean;
    }>,
    reservePrice?: number,
  ): AuctionResult {
    const activeBids = bids
      .filter((b) => !b.isRetracted)
      .sort((a, b) => Number(b.amount) - Number(a.amount));

    if (activeBids.length === 0) {
      return {
        auctionId,
        winnerId: null,
        winningBidId: null,
        winningBid: 0,
        finalPrice: 0,
        totalBids: bids.length,
        reserveMet: false,
      };
    }

    const highestBid = activeBids[0];
    const highestAmount = Number(highestBid.amount);
    const reserveMet = reservePrice ? highestAmount >= reservePrice : true;

    if (!reserveMet) {
      return {
        auctionId,
        winnerId: null,
        winningBidId: null,
        winningBid: highestAmount,
        finalPrice: 0,
        totalBids: bids.length,
        reserveMet: false,
      };
    }

    return {
      auctionId,
      winnerId: highestBid.userId,
      winningBidId: highestBid.id,
      winningBid: highestAmount,
      finalPrice: highestAmount,
      totalBids: bids.length,
      reserveMet: true,
    };
  }

  shouldExtend(context: BidContext): boolean {
    if (context.antiSnipeMinutes <= 0) return false;

    const timeRemainingMs = context.endDate.getTime() - context.timestamp.getTime();
    const thresholdMs = context.antiSnipeMinutes * 60 * 1000;

    return timeRemainingMs > 0 && timeRemainingMs < thresholdMs;
  }
}
