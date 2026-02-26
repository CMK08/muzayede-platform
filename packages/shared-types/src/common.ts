// ---------------------------------------------------------------------------
// Common / Shared Types
// ---------------------------------------------------------------------------

/** ISO-4217 currency codes supported by the platform */
export type Currency = 'TRY' | 'USD' | 'EUR' | 'GBP';

/** Supported UI languages */
export type Language = 'tr' | 'en' | 'de' | 'fr' | 'ar';

/** UI theme preference */
export type Theme = 'light' | 'dark' | 'system';

/** Generic sort direction */
export type SortOrder = 'asc' | 'desc';

/** Wrapper for any paginated list endpoint */
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    currentPage: number;
    perPage: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

/** Standard API response envelope */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
  errors?: ApiError[];
  timestamp: string;
  requestId: string;
}

/** Structured error detail returned inside ApiResponse */
export interface ApiError {
  code: string;
  field?: string;
  message: string;
}

/** Monetary value with currency */
export interface Money {
  amount: number;
  currency: Currency;
}

/** Reusable address block */
export interface Address {
  street: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  latitude?: number;
  longitude?: number;
}

/** Base entity fields shared by every domain model */
export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

/** Soft-deletable entity */
export interface SoftDeletable {
  deletedAt?: string | null;
  isDeleted: boolean;
}
