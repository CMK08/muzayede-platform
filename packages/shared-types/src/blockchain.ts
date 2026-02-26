// ---------------------------------------------------------------------------
// Blockchain / NFT Domain Types
// ---------------------------------------------------------------------------

import type { BaseEntity, Money } from './common';

/** Supported blockchain networks */
export type BlockchainNetwork = 'ethereum' | 'polygon' | 'solana' | 'avalanche';

/** NFT certificate minted to prove authenticity */
export interface NftCertificate extends BaseEntity {
  productId: string;
  auctionId?: string;
  tokenId: string;
  contractAddress: string;
  network: BlockchainNetwork;
  ownerWalletAddress: string;
  metadataUri: string;
  transactionHash: string;
  mintedAt: string;
  imageUrl?: string;
  isTransferable: boolean;
}

/** Record in the provenance chain of a product */
export interface ProvenanceRecord extends BaseEntity {
  productId: string;
  nftCertificateId?: string;
  event: ProvenanceEvent;
  description: string;
  actor: string;
  location?: string;
  documentUrl?: string;
  transactionHash?: string;
  verifiedBy?: string;
  occurredAt: string;
}

export type ProvenanceEvent =
  | 'creation'
  | 'exhibition'
  | 'sale'
  | 'auction'
  | 'restoration'
  | 'authentication'
  | 'transfer'
  | 'donation'
  | 'import'
  | 'export';

/** Fractional ownership token for high-value assets */
export interface FractionalToken extends BaseEntity {
  productId: string;
  nftCertificateId: string;
  tokenSymbol: string;
  totalSupply: number;
  availableSupply: number;
  pricePerToken: Money;
  contractAddress: string;
  network: BlockchainNetwork;
  holdersCount: number;
  isActive: boolean;
  distributedAt?: string;
}

/** Badge types users can earn */
export type BadgeType =
  | 'first_purchase'
  | 'top_bidder'
  | 'trusted_seller'
  | 'verified_collector'
  | 'early_adopter'
  | 'auction_winner_10'
  | 'auction_winner_50'
  | 'community_contributor'
  | 'expert_appraiser'
  | 'whale';

/** Gamification badge (optionally minted as NFT) */
export interface UserBadge extends BaseEntity {
  userId: string;
  type: BadgeType;
  name: string;
  description: string;
  iconUrl: string;
  nftCertificateId?: string;
  earnedAt: string;
  /** Badge can have levels (bronze, silver, gold) */
  level?: number;
  metadata?: Record<string, unknown>;
}
