// ---------------------------------------------------------------------------
// Product API Endpoints
// ---------------------------------------------------------------------------

import type {
  ApiResponse,
  Category,
  PaginatedResponse,
  Product,
  ProductCondition,
  ProductSummary,
  SortOrder,
} from '@muzayede/shared-types';
import { BaseApiClient } from '../client';

export interface ProductListParams {
  page?: number;
  perPage?: number;
  sortBy?: string;
  sortOrder?: SortOrder;
  query?: string;
  categoryId?: string;
  condition?: ProductCondition;
  sellerId?: string;
  minPrice?: number;
  maxPrice?: number;
  currency?: string;
  tags?: string[];
  isVerified?: boolean;
}

export interface CreateProductPayload {
  title: string;
  description: string;
  shortDescription?: string;
  categoryId: string;
  condition: ProductCondition;
  tags?: string[];
  attributes?: Array<{ key: string; value: string; unit?: string; group?: string }>;
  estimatedValueLow?: { amount: number; currency: string };
  estimatedValueHigh?: { amount: number; currency: string };
  startingPrice?: { amount: number; currency: string };
  dimensions?: { width: number; height: number; depth: number; unit: 'cm' | 'in' };
  weight?: { value: number; unit: 'kg' | 'lb' };
  origin?: string;
  year?: number;
  artist?: string;
  mediaUrls: string[];
}

export type UpdateProductPayload = Partial<CreateProductPayload> & { id: string };

export interface BulkUploadPayload {
  products: Array<{
    title: string;
    description: string;
    categoryId: string;
    condition: ProductCondition;
    estimatedValueLow?: { amount: number; currency: string };
    estimatedValueHigh?: { amount: number; currency: string };
    origin?: string;
    year?: number;
    artist?: string;
    mediaUrls: string[];
  }>;
}

export class ProductApi extends BaseApiClient {
  /**
   * List products with pagination and filters.
   */
  async list(
    params?: ProductListParams,
  ): Promise<ApiResponse<PaginatedResponse<ProductSummary>>> {
    return this.get<PaginatedResponse<ProductSummary>>('/products', { params });
  }

  /**
   * Get a single product by ID.
   */
  async getById(id: string): Promise<ApiResponse<Product>> {
    return this.get<Product>(`/products/${id}`);
  }

  /**
   * Get a single product by slug.
   */
  async getBySlug(slug: string): Promise<ApiResponse<Product>> {
    return this.get<Product>(`/products/slug/${slug}`);
  }

  /**
   * Create a new product.
   */
  async create(payload: CreateProductPayload): Promise<ApiResponse<Product>> {
    return this.post<Product>('/products', payload);
  }

  /**
   * Update an existing product.
   */
  async update({ id, ...payload }: UpdateProductPayload): Promise<ApiResponse<Product>> {
    return this.put<Product>(`/products/${id}`, payload);
  }

  /**
   * Delete a product (soft delete).
   */
  async remove(id: string): Promise<ApiResponse<{ message: string }>> {
    return this.delete<{ message: string }>(`/products/${id}`);
  }

  /**
   * Bulk upload multiple products at once.
   */
  async bulkUpload(
    payload: BulkUploadPayload,
  ): Promise<ApiResponse<{ created: number; failed: number; errors: string[] }>> {
    return this.post('/products/bulk', payload);
  }

  /**
   * Upload product media (images/videos).
   */
  async uploadMedia(
    productId: string,
    formData: FormData,
    onProgress?: (percentage: number) => void,
  ): Promise<ApiResponse<{ urls: string[] }>> {
    return this.upload<{ urls: string[] }>(
      `/products/${productId}/media`,
      formData,
      onProgress,
    );
  }

  /**
   * Delete a media asset from a product.
   */
  async deleteMedia(
    productId: string,
    mediaId: string,
  ): Promise<ApiResponse<{ message: string }>> {
    return this.delete<{ message: string }>(`/products/${productId}/media/${mediaId}`);
  }

  /**
   * Get all categories (flat list or tree).
   */
  async getCategories(tree = false): Promise<ApiResponse<Category[]>> {
    return this.get<Category[]>('/categories', { params: { tree } });
  }

  /**
   * Add product to favourites.
   */
  async favourite(productId: string): Promise<ApiResponse<{ message: string }>> {
    return this.post<{ message: string }>(`/products/${productId}/favourite`);
  }

  /**
   * Remove product from favourites.
   */
  async unfavourite(productId: string): Promise<ApiResponse<{ message: string }>> {
    return this.delete<{ message: string }>(`/products/${productId}/favourite`);
  }
}
