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
export class SealedBidStrategy implements AuctionTypeStrategy {
  readonly type = AuctionType.SEALED_BID;

  validateBid(context: BidContext): BidValidationResult {
    if (context.bidderId === context.sellerId) {
      return { valid: false, reason: 'Seller cannot bid on their own auction' };
    }

    // Sealed bids can be placed during PRE_BID or LIVE phases
    if (context.auctionStatus !== 'PRE_BID' && context.auctionStatus !== 'LIVE') {
      return { valid: false, reason: 'Auction is not accepting bids at this time' };
    }

    if (context.bidAmount <= 0) {
      return { valid: false, reason: 'Bid amount must be greater than zero' };
    }

    if (context.bidAmount < context.startPrice) {
      return {
        valid: false,
        reason: `Bid must be at least the starting price of ${context.startPrice}`,
      };
    }

    return { valid: true };
  }

  calculateNewPrice(context: BidContext): number {
    // Sealed bids do not reveal the current price to other bidders
    // The displayed price stays at the start price
    return context.startPrice;
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
    // First-price sealed-bid: highest bid wins and pays their bid amount
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

  /**
   * Called at auction end to reveal all bids sorted by amount.
   * Returns bids in descending order of amount for display.
   */
  revealBids(
    bids: Array<{
      id: string;
      userId: string;
      amount: Decimal;
      createdAt: Date;
      isRetracted: boolean;
    }>,
  ): Array<{ id: string; userId: string; amount: number; rank: number }> {
    return bids
      .filter((b) => !b.isRetracted)
      .sort((a, b) => Number(b.amount) - Number(a.amount))
      .map((bid, index) => ({
        id: bid.id,
        userId: bid.userId,
        amount: Number(bid.amount),
        rank: index + 1,
      }));
  }

  shouldExtend(_context: BidContext): boolean {
    // Sealed-bid auctions have a fixed deadline, no extensions
    return false;
  }
}
