// ---------------------------------------------------------------------------
// Bid API Endpoints
// ---------------------------------------------------------------------------

import type {
  ApiResponse,
  Bid,
  BidHistoryEntry,
  PaginatedResponse,
  ProxyBid,
} from '@muzayede/shared-types';
import { BaseApiClient } from '../client';

export interface PlaceBidPayload {
  auctionId: string;
  lotId?: string;
  amount: { amount: number; currency: string };
  type: 'manual' | 'buy_now';
}

export interface ProxyBidPayload {
  auctionId: string;
  lotId?: string;
  maxAmount: { amount: number; currency: string };
  startAmount?: { amount: number; currency: string };
}

export interface BidListParams {
  page?: number;
  perPage?: number;
  auctionId?: string;
  lotId?: string;
  bidderId?: string;
}

export class BidApi extends BaseApiClient {
  /**
   * Place a manual or buy-now bid.
   */
  async place(payload: PlaceBidPayload): Promise<ApiResponse<Bid>> {
    return this.post<Bid>('/bids', payload);
  }

  /**
   * Set up an automatic / proxy bid.
   */
  async placeProxy(payload: ProxyBidPayload): Promise<ApiResponse<ProxyBid>> {
    return this.post<ProxyBid>('/bids/proxy', payload);
  }

  /**
   * Get a bid by ID.
   */
  async getById(id: string): Promise<ApiResponse<Bid>> {
    return this.get<Bid>(`/bids/${id}`);
  }

  /**
   * Retract a bid (only allowed under specific conditions).
   */
  async retract(
    bidId: string,
    reason: string,
  ): Promise<ApiResponse<{ message: string }>> {
    return this.post<{ message: string }>(`/bids/${bidId}/retract`, { reason });
  }

  /**
   * Get bid history for an auction (public, privacy-aware).
   */
  async getHistory(
    auctionId: string,
    params?: { page?: number; perPage?: number; lotId?: string },
  ): Promise<ApiResponse<PaginatedResponse<BidHistoryEntry>>> {
    return this.get<PaginatedResponse<BidHistoryEntry>>(
      `/auctions/${auctionId}/bids`,
      { params },
    );
  }

  /**
   * Get the current user's bids across all auctions.
   */
  async myBids(
    params?: BidListParams,
  ): Promise<ApiResponse<PaginatedResponse<Bid>>> {
    return this.get<PaginatedResponse<Bid>>('/bids/my', { params });
  }

  /**
   * Get the current user's active proxy bids.
   */
  async myProxyBids(): Promise<ApiResponse<ProxyBid[]>> {
    return this.get<ProxyBid[]>('/bids/proxy/my');
  }

  /**
   * Cancel a proxy bid.
   */
  async cancelProxy(proxyBidId: string): Promise<ApiResponse<{ message: string }>> {
    return this.post<{ message: string }>(`/bids/proxy/${proxyBidId}/cancel`);
  }

  /**
   * Update the max amount of a proxy bid.
   */
  async updateProxy(
    proxyBidId: string,
    maxAmount: { amount: number; currency: string },
  ): Promise<ApiResponse<ProxyBid>> {
    return this.patch<ProxyBid>(`/bids/proxy/${proxyBidId}`, { maxAmount });
  }
}
