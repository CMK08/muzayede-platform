import { Decimal } from '@prisma/client/runtime/library';

export enum AuctionType {
  ENGLISH = 'ENGLISH',
  DUTCH = 'DUTCH',
  SEALED_BID = 'SEALED_BID',
  VICKREY = 'VICKREY',
  TIMED = 'TIMED',
  HYBRID = 'HYBRID',
}

export interface BidContext {
  auctionId: string;
  bidderId: string;
  sellerId: string;
  bidAmount: number;
  currentPrice: number;
  startPrice: number;
  reservePrice?: number;
  minIncrement: number;
  auctionStatus: string;
  auctionType: string;
  timestamp: Date;
  endDate: Date;
  antiSnipeMinutes: number;
}

export interface AuctionResult {
  auctionId: string;
  winnerId: string | null;
  winningBidId: string | null;
  winningBid: number;
  finalPrice: number;
  totalBids: number;
  reserveMet: boolean;
}

export interface BidValidationResult {
  valid: boolean;
  reason?: string;
}

export interface AuctionTypeStrategy {
  readonly type: AuctionType;

  validateBid(context: BidContext): BidValidationResult;

  calculateNewPrice(context: BidContext): number;

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
  ): AuctionResult;

  shouldExtend(context: BidContext): boolean;
}
