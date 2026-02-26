// ---------------------------------------------------------------------------
// Auction Domain Types
// ---------------------------------------------------------------------------

import type { BaseEntity, Money, SoftDeletable } from './common';
import type { UserSummary } from './user';

/** Supported auction mechanisms */
export type AuctionType =
  | 'english'
  | 'dutch'
  | 'sealed_bid'
  | 'vickrey'
  | 'timed'
  | 'hybrid';

/** Lifecycle status of an auction */
export type AuctionStatus =
  | 'draft'
  | 'published'
  | 'pre_bid'
  | 'live'
  | 'completed'
  | 'cancelled';

/** Anti-snipe settings to prevent last-second bids */
export interface AntiSnipeConfig {
  enabled: boolean;
  /** Number of seconds before end that triggers extension */
  thresholdSeconds: number;
  /** Duration in seconds to extend the auction */
  extensionSeconds: number;
  /** Maximum number of extensions allowed */
  maxExtensions: number;
  currentExtensions: number;
}

/** Reserve price configuration */
export interface ReservePrice {
  amount: Money;
  /** Whether to reveal that a reserve exists (not the amount) */
  isPublic: boolean;
  isMet: boolean;
}

/** Individual lot within a multi-lot auction */
export interface AuctionLot extends BaseEntity {
  auctionId: string;
  lotNumber: string;
  title: string;
  description: string;
  productId: string;
  startingPrice: Money;
  currentPrice?: Money;
  estimateLow?: Money;
  estimateHigh?: Money;
  reservePrice?: ReservePrice;
  bidCount: number;
  sortOrder: number;
  status: AuctionStatus;
  winnerId?: string;
  winningBidId?: string;
}

/** Schedule for an upcoming auction */
export interface AuctionSchedule {
  startDate: string;
  endDate: string;
  previewStartDate?: string;
  preBidStartDate?: string;
  timezone: string;
}

/** Core auction entity */
export interface Auction extends BaseEntity, SoftDeletable {
  slug: string;
  title: string;
  description: string;
  type: AuctionType;
  status: AuctionStatus;
  auctioneer: UserSummary;
  schedule: AuctionSchedule;
  antiSnipeConfig: AntiSnipeConfig;
  startingPrice: Money;
  currentPrice?: Money;
  buyNowPrice?: Money;
  bidIncrement: Money;
  reservePrice?: ReservePrice;
  lots: AuctionLot[];
  totalLots: number;
  totalBids: number;
  totalWatchers: number;
  categoryId: string;
  tags: string[];
  coverImageUrl?: string;
  galleryUrls: string[];
  featured: boolean;
  termsAndConditions?: string;
  /** Deposit required to participate */
  depositAmount?: Money;
  commissionRate: number;
  metadata?: Record<string, unknown>;
}

/** Lightweight auction card for list views */
export interface AuctionSummary {
  id: string;
  slug: string;
  title: string;
  type: AuctionType;
  status: AuctionStatus;
  coverImageUrl?: string;
  currentPrice?: Money;
  startingPrice: Money;
  bidCount: number;
  endDate: string;
  featured: boolean;
}
