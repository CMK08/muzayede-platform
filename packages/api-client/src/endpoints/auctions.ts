// ---------------------------------------------------------------------------
// Auction API Endpoints
// ---------------------------------------------------------------------------

import type {
  ApiResponse,
  Auction,
  AuctionLot,
  AuctionSummary,
  AuctionStatus,
  AuctionType,
  PaginatedResponse,
  SortOrder,
} from '@muzayede/shared-types';
import { BaseApiClient } from '../client';

export interface AuctionListParams {
  page?: number;
  perPage?: number;
  sortBy?: string;
  sortOrder?: SortOrder;
  query?: string;
  type?: AuctionType;
  status?: AuctionStatus;
  categoryId?: string;
  auctioneerId?: string;
  minPrice?: number;
  maxPrice?: number;
  currency?: string;
  startDateFrom?: string;
  startDateTo?: string;
  featured?: boolean;
  tags?: string[];
}

export interface CreateAuctionPayload {
  title: string;
  description: string;
  type: AuctionType;
  schedule: {
    startDate: string;
    endDate: string;
    previewStartDate?: string;
    preBidStartDate?: string;
    timezone?: string;
  };
  startingPrice: { amount: number; currency: string };
  bidIncrement: { amount: number; currency: string };
  buyNowPrice?: { amount: number; currency: string };
  categoryId: string;
  tags?: string[];
  coverImageUrl?: string;
  galleryUrls?: string[];
  commissionRate?: number;
  termsAndConditions?: string;
  depositAmount?: { amount: number; currency: string };
  antiSnipeConfig?: {
    enabled: boolean;
    thresholdSeconds?: number;
    extensionSeconds?: number;
    maxExtensions?: number;
  };
  reservePrice?: {
    amount: { amount: number; currency: string };
    isPublic?: boolean;
  };
}

export type UpdateAuctionPayload = Partial<CreateAuctionPayload> & { id: string };

export class AuctionApi extends BaseApiClient {
  /**
   * List auctions with pagination and filters.
   */
  async list(
    params?: AuctionListParams,
  ): Promise<ApiResponse<PaginatedResponse<AuctionSummary>>> {
    return this.get<PaginatedResponse<AuctionSummary>>('/auctions', { params });
  }

  /**
   * Get a single auction by ID.
   */
  async getById(id: string): Promise<ApiResponse<Auction>> {
    return this.get<Auction>(`/auctions/${id}`);
  }

  /**
   * Get a single auction by slug.
   */
  async getBySlug(slug: string): Promise<ApiResponse<Auction>> {
    return this.get<Auction>(`/auctions/slug/${slug}`);
  }

  /**
   * Create a new auction (draft).
   */
  async create(payload: CreateAuctionPayload): Promise<ApiResponse<Auction>> {
    return this.post<Auction>('/auctions', payload);
  }

  /**
   * Update an existing auction.
   */
  async update({ id, ...payload }: UpdateAuctionPayload): Promise<ApiResponse<Auction>> {
    return this.put<Auction>(`/auctions/${id}`, payload);
  }

  /**
   * Publish a draft auction (status -> published).
   */
  async publish(id: string): Promise<ApiResponse<Auction>> {
    return this.post<Auction>(`/auctions/${id}/publish`);
  }

  /**
   * Cancel an auction.
   */
  async cancel(
    id: string,
    reason: string,
  ): Promise<ApiResponse<Auction>> {
    return this.post<Auction>(`/auctions/${id}/cancel`, { reason });
  }

  /**
   * Delete a draft auction (soft delete).
   */
  async remove(id: string): Promise<ApiResponse<{ message: string }>> {
    return this.delete<{ message: string }>(`/auctions/${id}`);
  }

  /**
   * Get lots for a multi-lot auction.
   */
  async getLots(auctionId: string): Promise<ApiResponse<AuctionLot[]>> {
    return this.get<AuctionLot[]>(`/auctions/${auctionId}/lots`);
  }

  /**
   * Add/watch an auction to the user's watchlist.
   */
  async watch(auctionId: string): Promise<ApiResponse<{ message: string }>> {
    return this.post<{ message: string }>(`/auctions/${auctionId}/watch`);
  }

  /**
   * Remove an auction from the user's watchlist.
   */
  async unwatch(auctionId: string): Promise<ApiResponse<{ message: string }>> {
    return this.delete<{ message: string }>(`/auctions/${auctionId}/watch`);
  }

  /**
   * Get featured / highlighted auctions.
   */
  async featured(limit = 10): Promise<ApiResponse<AuctionSummary[]>> {
    return this.get<AuctionSummary[]>('/auctions/featured', {
      params: { limit },
    });
  }

  /**
   * Get auctions ending soon.
   */
  async endingSoon(limit = 10): Promise<ApiResponse<AuctionSummary[]>> {
    return this.get<AuctionSummary[]>('/auctions/ending-soon', {
      params: { limit },
    });
  }
}
