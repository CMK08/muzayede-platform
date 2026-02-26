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
export class VickreyAuctionStrategy implements AuctionTypeStrategy {
  readonly type = AuctionType.VICKREY;

  validateBid(context: BidContext): BidValidationResult {
    if (context.bidderId === context.sellerId) {
      return { valid: false, reason: 'Seller cannot bid on their own auction' };
    }

    // Vickrey bids can be placed during PRE_BID or LIVE phases
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
    // Like sealed-bid, the current price is not revealed during bidding
    return context.startPrice;
  }

  /**
   * Vickrey auction: highest bidder wins but pays the SECOND-highest price.
   * If there is only one bid, the winner pays the start price.
   */
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

    // Calculate final price: second-highest bid, or startPrice if only one bid
    const finalPrice = this.calculateFinalPrice(activeBids);

    return {
      auctionId,
      winnerId: highestBid.userId,
      winningBidId: highestBid.id,
      winningBid: highestAmount,
      finalPrice,
      totalBids: bids.length,
      reserveMet: true,
    };
  }

  /**
   * Calculate the second-price (Vickrey) final price.
   * Returns the second-highest bid amount, or the first bid if only one exists.
   */
  calculateFinalPrice(
    sortedBids: Array<{
      id: string;
      userId: string;
      amount: Decimal;
      createdAt: Date;
      isRetracted: boolean;
    }>,
  ): number {
    if (sortedBids.length === 0) return 0;
    if (sortedBids.length === 1) {
      // Only one bid: winner pays their own bid (or could be startPrice, depending on rules)
      // Standard Vickrey with one bidder: they pay the reserve/start price
      return Number(sortedBids[0].amount);
    }
    // Second-highest bid amount
    return Number(sortedBids[1].amount);
  }

  shouldExtend(_context: BidContext): boolean {
    // Vickrey auctions have a fixed deadline, no extensions
    return false;
  }
}
