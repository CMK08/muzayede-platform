// ---------------------------------------------------------------------------
// User Domain Types
// ---------------------------------------------------------------------------

import type { Address, BaseEntity, Language, Theme } from './common';

/** Platform roles a user can hold */
export type UserRole =
  | 'buyer'
  | 'seller'
  | 'auctioneer'
  | 'admin'
  | 'super_admin'
  | 'moderator';

/** Know-Your-Customer verification status */
export type KycStatus =
  | 'not_started'
  | 'pending'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'expired';

/** Reputation / trust score breakdown */
export interface TrustScore {
  overall: number;
  paymentReliability: number;
  shippingSpeed: number;
  communicationRating: number;
  disputeRate: number;
  totalTransactions: number;
  positiveRatings: number;
  negativeRatings: number;
  lastCalculatedAt: string;
}

/** Extended profile information stored alongside User */
export interface UserProfile {
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  companyName?: string;
  taxId?: string;
  phone?: string;
  dateOfBirth?: string;
  address?: Address;
  preferredLanguage: Language;
  theme: Theme;
  notificationEmail?: string;
  website?: string;
  socialLinks?: {
    instagram?: string;
    twitter?: string;
    linkedin?: string;
  };
}

/** Core user entity */
export interface User extends BaseEntity {
  email: string;
  username: string;
  roles: UserRole[];
  kycStatus: KycStatus;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  isTwoFactorEnabled: boolean;
  profile: UserProfile;
  trustScore: TrustScore;
  walletAddress?: string;
  lastLoginAt?: string;
  isBanned: boolean;
  banReason?: string;
}

/** Minimal user representation embedded in other entities */
export interface UserSummary {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  trustScore: number;
}
