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
export class DutchAuctionStrategy implements AuctionTypeStrategy {
  readonly type = AuctionType.DUTCH;

  validateBid(context: BidContext): BidValidationResult {
    if (context.bidderId === context.sellerId) {
      return { valid: false, reason: 'Seller cannot bid on their own auction' };
    }

    if (context.auctionStatus !== 'LIVE') {
      return { valid: false, reason: 'Auction is not currently live' };
    }

    // In Dutch auction, the first valid bid at or above current price wins
    if (context.bidAmount < context.currentPrice) {
      return {
        valid: false,
        reason: `Bid must be at least the current asking price of ${context.currentPrice}`,
      };
    }

    return { valid: true };
  }

  calculateNewPrice(context: BidContext): number {
    // Dutch auction: price is set by the scheduler (decreasing), not by bids
    // When a bid is accepted, the auction ends at the current price
    return context.currentPrice;
  }

  /**
   * Reduce the price by the configured decrement amount.
   * Returns the new price, or null if the floor has been reached.
   */
  reducePriceStep(currentPrice: number, dutchDecrement: number, floorPrice: number): number | null {
    const newPrice = currentPrice - dutchDecrement;
    if (newPrice <= floorPrice) {
      return null; // Floor reached; auction should end as unsold
    }
    return newPrice;
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
    // In Dutch auction, the first (earliest) non-retracted bid wins
    const activeBids = bids
      .filter((b) => !b.isRetracted)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

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

    const firstBid = activeBids[0];
    const bidAmount = Number(firstBid.amount);
    const reserveMet = reservePrice ? bidAmount >= reservePrice : true;

    return {
      auctionId,
      winnerId: firstBid.userId,
      winningBidId: firstBid.id,
      winningBid: bidAmount,
      finalPrice: bidAmount,
      totalBids: bids.length,
      reserveMet,
    };
  }

  shouldExtend(_context: BidContext): boolean {
    // Dutch auctions never extend; they end when someone bids or price hits floor
    return false;
  }
}
