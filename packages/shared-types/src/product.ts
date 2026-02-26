// ---------------------------------------------------------------------------
// Product Domain Types
// ---------------------------------------------------------------------------

import type { BaseEntity, Money, SoftDeletable } from './common';
import type { UserSummary } from './user';

/** Condition grading for physical goods */
export type ProductCondition =
  | 'new'
  | 'like_new'
  | 'excellent'
  | 'very_good'
  | 'good'
  | 'fair'
  | 'poor'
  | 'for_parts';

/** Supported media types for product imagery */
export type MediaType = 'image' | 'video' | '360_spin' | 'document';

/** Media asset attached to a product */
export interface ProductMedia extends BaseEntity {
  productId: string;
  type: MediaType;
  url: string;
  thumbnailUrl?: string;
  altText?: string;
  sortOrder: number;
  width?: number;
  height?: number;
  sizeBytes?: number;
  mimeType: string;
  isPrimary: boolean;
}

/** Hierarchical category */
export interface Category extends BaseEntity {
  name: string;
  slug: string;
  description?: string;
  parentId?: string;
  iconUrl?: string;
  sortOrder: number;
  isActive: boolean;
  depth: number;
  path: string[];
  productCount: number;
}

/** Freeform tag for product classification */
export interface Tag extends BaseEntity {
  name: string;
  slug: string;
  usageCount: number;
}

/** Dynamic key-value attribute (e.g. "Material" : "Bronze") */
export interface ProductAttribute {
  key: string;
  value: string;
  unit?: string;
  group?: string;
}

/** Core product entity */
export interface Product extends BaseEntity, SoftDeletable {
  title: string;
  slug: string;
  description: string;
  shortDescription?: string;
  seller: UserSummary;
  category: Category;
  tags: Tag[];
  condition: ProductCondition;
  media: ProductMedia[];
  attributes: ProductAttribute[];
  estimatedValueLow?: Money;
  estimatedValueHigh?: Money;
  startingPrice?: Money;
  dimensions?: {
    width: number;
    height: number;
    depth: number;
    unit: 'cm' | 'in';
  };
  weight?: {
    value: number;
    unit: 'kg' | 'lb';
  };
  origin?: string;
  year?: number;
  artist?: string;
  authenticityCertificateUrl?: string;
  isVerified: boolean;
  verifiedBy?: string;
  viewCount: number;
  favoriteCount: number;
  metadata?: Record<string, unknown>;
}

/** Lightweight product card for list views */
export interface ProductSummary {
  id: string;
  slug: string;
  title: string;
  primaryImageUrl?: string;
  condition: ProductCondition;
  estimatedValueLow?: Money;
  estimatedValueHigh?: Money;
  categoryName: string;
}
