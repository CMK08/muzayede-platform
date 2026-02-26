import { Injectable } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import {
  AuctionType,
  AuctionTypeStrategy,
  BidContext,
  BidValidationResult,
  AuctionResult,
} from './auction-type.interface';

/**
 * Hybrid auction strategy: combines pre-bid (sealed) and live (English) phases.
 *
 * Phase 1 (PRE_BID): Accept online pre-bids in sealed fashion.
 *   - Bids are not broadcast; they are hidden until LIVE phase starts.
 *   - Bid must be >= startPrice.
 *
 * Phase 2 (LIVE): Switch to English-style ascending bidding.
 *   - The current price is set to the highest pre-bid at phase transition.
 *   - Standard English rules apply (bid > currentPrice + minIncrement).
 *   - Anti-snipe extension is active.
 *
 * Winner determination: highest bid across both phases.
 */
@Injectable()
export class HybridAuctionStrategy implements AuctionTypeStrategy {
  readonly type = AuctionType.HYBRID;

  validateBid(context: BidContext): BidValidationResult {
    if (context.bidderId === context.sellerId) {
      return { valid: false, reason: 'Seller cannot bid on their own auction' };
    }

    // Phase 1: PRE_BID phase — sealed pre-bids
    if (context.auctionStatus === 'PRE_BID') {
      if (context.bidAmount <= 0) {
        return { valid: false, reason: 'Bid amount must be greater than zero' };
      }
      if (context.bidAmount < context.startPrice) {
        return {
          valid: false,
          reason: `Pre-bid must be at least the starting price of ${context.startPrice}`,
        };
      }
      return { valid: true };
    }

    // Phase 2: LIVE phase — English-style ascending bids
    if (context.auctionStatus === 'LIVE') {
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

    return { valid: false, reason: 'Auction is not accepting bids in its current phase' };
  }

  calculateNewPrice(context: BidContext): number {
    // During PRE_BID, displayed price stays at startPrice (bids are hidden)
    if (context.auctionStatus === 'PRE_BID') {
      return context.startPrice;
    }
    // During LIVE, price ascends to the bid amount
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
    // Highest bid from either phase wins
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
    // Only extend during LIVE phase
    if (context.auctionStatus !== 'LIVE') return false;
    if (context.antiSnipeMinutes <= 0) return false;

    const timeRemainingMs = context.endDate.getTime() - context.timestamp.getTime();
    const thresholdMs = context.antiSnipeMinutes * 60 * 1000;

    return timeRemainingMs > 0 && timeRemainingMs < thresholdMs;
  }
}
