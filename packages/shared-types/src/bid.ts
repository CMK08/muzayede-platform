// ---------------------------------------------------------------------------
// Bid Domain Types
// ---------------------------------------------------------------------------

import type { BaseEntity, Money } from './common';
import type { UserSummary } from './user';

/** Classification of bid placement method */
export type BidType = 'manual' | 'proxy' | 'absentee' | 'buy_now';

/** Current state of a bid */
export type BidStatus =
  | 'pending'
  | 'accepted'
  | 'outbid'
  | 'rejected'
  | 'retracted'
  | 'winning';

/** Configuration for automatic bid increments based on price brackets */
export interface BidIncrement {
  fromAmount: Money;
  toAmount: Money;
  increment: Money;
}

/** Proxy bid: system bids on behalf of user up to a maximum */
export interface ProxyBid extends BaseEntity {
  auctionId: string;
  lotId?: string;
  bidder: UserSummary;
  maxAmount: Money;
  currentAmount: Money;
  isActive: boolean;
  bidCount: number;
  lastBidAt?: string;
}

/** Core bid entity */
export interface Bid extends BaseEntity {
  auctionId: string;
  lotId?: string;
  bidder: UserSummary;
  amount: Money;
  type: BidType;
  status: BidStatus;
  /** Reference to the proxy bid record if type === 'proxy' */
  proxyBidId?: string;
  /** IP address of the bidder for audit trail */
  ipAddress?: string;
  userAgent?: string;
  isAutoBid: boolean;
  previousBidId?: string;
  retractedAt?: string;
  retractReason?: string;
}

/** Real-time bid update pushed via WebSocket */
export interface BidEvent {
  auctionId: string;
  lotId?: string;
  bidId: string;
  bidderId: string;
  bidderUsername: string;
  amount: Money;
  type: BidType;
  timestamp: string;
  newEndTime?: string;
  antiSnipeTriggered: boolean;
}

/** Bid history entry displayed to users (privacy-aware) */
export interface BidHistoryEntry {
  id: string;
  bidderDisplayName: string;
  amount: Money;
  type: BidType;
  status: BidStatus;
  createdAt: string;
  isLeading: boolean;
}
