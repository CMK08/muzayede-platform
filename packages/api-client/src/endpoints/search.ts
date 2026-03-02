// ---------------------------------------------------------------------------
// Search API Endpoints
// ---------------------------------------------------------------------------

import type { ApiResponse, PaginatedResponse } from '@muzayede/shared-types';
import { BaseApiClient } from '../client';

export type SearchEntity = 'product' | 'auction' | 'user' | 'category';

export interface SearchParams {
  query: string;
  entity?: SearchEntity | SearchEntity[];
  page?: number;
  perPage?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: {
    categoryId?: string;
    condition?: string;
    status?: string;
    type?: string;
    minPrice?: number;
    maxPrice?: number;
    currency?: string;
    tags?: string[];
    dateFrom?: string;
    dateTo?: string;
    location?: string;
  };
}

export interface SearchResult {
  id: string;
  entity: SearchEntity;
  title: string;
  description?: string;
  imageUrl?: string;
  slug?: string;
  price?: { amount: number; currency: string };
  highlights?: Record<string, string[]>;
  score: number;
  metadata?: Record<string, unknown>;
}

export interface AutocompleteParams {
  query: string;
  entity?: SearchEntity | SearchEntity[];
  limit?: number;
}

export interface AutocompleteSuggestion {
  text: string;
  entity: SearchEntity;
  id?: string;
  imageUrl?: string;
}

export interface SearchSuggestion {
  query: string;
  resultCount: number;
  category?: string;
}

export interface FacetValue {
  value: string;
  count: number;
  label?: string;
}

export interface SearchFacets {
  categories: FacetValue[];
  conditions: FacetValue[];
  priceRanges: FacetValue[];
  tags: FacetValue[];
  types: FacetValue[];
}

export interface ReindexPayload {
  entities?: SearchEntity[];
  forceRebuild?: boolean;
}

export class SearchApi extends BaseApiClient {
  /**
   * Search across products and auctions with filters.
   */
  async search(
    params: SearchParams,
  ): Promise<ApiResponse<PaginatedResponse<SearchResult> & { facets?: SearchFacets }>> {
    return this.post<PaginatedResponse<SearchResult> & { facets?: SearchFacets }>(
      '/search',
      params,
    );
  }

  /**
   * Search products only.
   */
  async searchProducts(
    params: Omit<SearchParams, 'entity'>,
  ): Promise<ApiResponse<PaginatedResponse<SearchResult>>> {
    return this.post<PaginatedResponse<SearchResult>>('/search/products', params);
  }

  /**
   * Search auctions only.
   */
  async searchAuctions(
    params: Omit<SearchParams, 'entity'>,
  ): Promise<ApiResponse<PaginatedResponse<SearchResult>>> {
    return this.post<PaginatedResponse<SearchResult>>('/search/auctions', params);
  }

  /**
   * Get autocomplete suggestions as the user types.
   */
  async autocomplete(
    params: AutocompleteParams,
  ): Promise<ApiResponse<AutocompleteSuggestion[]>> {
    return this.get<AutocompleteSuggestion[]>('/search/autocomplete', { params });
  }

  /**
   * Get search suggestions (popular searches, trending, similar queries).
   */
  async suggestions(
    query?: string,
    limit?: number,
  ): Promise<ApiResponse<SearchSuggestion[]>> {
    return this.get<SearchSuggestion[]>('/search/suggestions', {
      params: { query, limit },
    });
  }

  /**
   * Get trending search terms.
   */
  async trending(limit = 10): Promise<ApiResponse<SearchSuggestion[]>> {
    return this.get<SearchSuggestion[]>('/search/trending', {
      params: { limit },
    });
  }

  /**
   * Get available facets/filters for a search query.
   */
  async facets(
    query: string,
    entity?: SearchEntity,
  ): Promise<ApiResponse<SearchFacets>> {
    return this.get<SearchFacets>('/search/facets', {
      params: { query, entity },
    });
  }

  /**
   * Save a search query for alerts.
   */
  async saveSearch(
    payload: { query: string; filters?: SearchParams['filters']; notifyByEmail?: boolean },
  ): Promise<ApiResponse<{ id: string; message: string }>> {
    return this.post<{ id: string; message: string }>('/search/saved', payload);
  }

  /**
   * Get the current user's saved searches.
   */
  async getSavedSearches(): Promise<
    ApiResponse<
      Array<{
        id: string;
        query: string;
        filters?: SearchParams['filters'];
        notifyByEmail: boolean;
        createdAt: string;
      }>
    >
  > {
    return this.get('/search/saved');
  }

  /**
   * Delete a saved search.
   */
  async deleteSavedSearch(id: string): Promise<ApiResponse<{ message: string }>> {
    return this.delete<{ message: string }>(`/search/saved/${id}`);
  }

  /**
   * Get recent searches for the current user.
   */
  async recentSearches(limit = 10): Promise<ApiResponse<string[]>> {
    return this.get<string[]>('/search/recent', { params: { limit } });
  }

  /**
   * Clear recent search history.
   */
  async clearRecentSearches(): Promise<ApiResponse<{ message: string }>> {
    return this.delete<{ message: string }>('/search/recent');
  }

  // -- Admin endpoints ---------------------------------------------------

  /**
   * Trigger a full or partial reindex of the search index (admin only).
   */
  async reindex(
    payload?: ReindexPayload,
  ): Promise<ApiResponse<{ jobId: string; message: string }>> {
    return this.post<{ jobId: string; message: string }>('/admin/search/reindex', payload);
  }

  /**
   * Get the current reindex job status (admin only).
   */
  async getReindexStatus(
    jobId: string,
  ): Promise<
    ApiResponse<{
      jobId: string;
      status: 'pending' | 'running' | 'completed' | 'failed';
      progress: number;
      startedAt?: string;
      completedAt?: string;
      error?: string;
    }>
  > {
    return this.get(`/admin/search/reindex/${jobId}`);
  }
}
