// ---------------------------------------------------------------------------
// CMS Domain Types (Pages & Banners)
// ---------------------------------------------------------------------------

import type { BaseEntity } from './common';

/** Content page status */
export type PageStatus = 'draft' | 'published' | 'archived';

/** Static / dynamic page managed through the CMS */
export interface Page extends BaseEntity {
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  featuredImageUrl?: string;
  status: PageStatus;
  authorId: string;
  locale: string;
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    ogImageUrl?: string;
    canonicalUrl?: string;
    noIndex?: boolean;
  };
  publishedAt?: string;
  sortOrder: number;
  parentId?: string;
  template?: string;
}

/** Banner placement area */
export type BannerPlacement =
  | 'hero'
  | 'sidebar'
  | 'footer'
  | 'category_header'
  | 'auction_detail'
  | 'popup';

/** Promotional banner */
export interface Banner extends BaseEntity {
  title: string;
  subtitle?: string;
  imageUrl: string;
  mobileImageUrl?: string;
  linkUrl?: string;
  placement: BannerPlacement;
  backgroundColor?: string;
  textColor?: string;
  ctaText?: string;
  isActive: boolean;
  startDate?: string;
  endDate?: string;
  sortOrder: number;
  impressionCount: number;
  clickCount: number;
  targetAudience?: string[];
}
