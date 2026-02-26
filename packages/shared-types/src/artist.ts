// ---------------------------------------------------------------------------
// Artist & Exhibition Domain Types
// ---------------------------------------------------------------------------

import type { BaseEntity } from './common';

/** Artist / creator profile */
export interface Artist extends BaseEntity {
  name: string;
  slug: string;
  biography?: string;
  birthYear?: number;
  deathYear?: number;
  nationality?: string;
  portraitUrl?: string;
  website?: string;
  socialLinks?: {
    instagram?: string;
    twitter?: string;
    website?: string;
  };
  /** Art movements or styles associated with the artist */
  styles: string[];
  /** Media used (oil, watercolor, bronze, etc.) */
  media: string[];
  totalWorks: number;
  totalAuctions: number;
  isVerified: boolean;
  verifiedBy?: string;
}

/** Exhibition or catalog linked to artworks */
export interface Exhibition extends BaseEntity {
  title: string;
  slug: string;
  description?: string;
  venue: string;
  city: string;
  country: string;
  startDate: string;
  endDate: string;
  coverImageUrl?: string;
  galleryUrls: string[];
  artistIds: string[];
  productIds: string[];
  catalogUrl?: string;
  isVirtual: boolean;
  virtualTourUrl?: string;
  isActive: boolean;
  viewCount: number;
}
