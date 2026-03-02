// ---------------------------------------------------------------------------
// CMS API Endpoints
// ---------------------------------------------------------------------------

import type { ApiResponse, PaginatedResponse } from '@muzayede/shared-types';
import { BaseApiClient } from '../client';

// -- Pages ----------------------------------------------------------------

export interface Page {
  id: string;
  slug: string;
  title: string;
  content: string;
  metaTitle?: string;
  metaDescription?: string;
  isPublished: boolean;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePagePayload {
  slug: string;
  title: string;
  content: string;
  metaTitle?: string;
  metaDescription?: string;
  isPublished?: boolean;
}

export type UpdatePagePayload = Partial<CreatePagePayload> & { id: string };

// -- Banners --------------------------------------------------------------

export interface Banner {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl: string;
  mobileImageUrl?: string;
  linkUrl?: string;
  linkTarget?: '_self' | '_blank';
  position: string;
  sortOrder: number;
  isActive: boolean;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBannerPayload {
  title: string;
  subtitle?: string;
  imageUrl: string;
  mobileImageUrl?: string;
  linkUrl?: string;
  linkTarget?: '_self' | '_blank';
  position: string;
  sortOrder?: number;
  isActive?: boolean;
  startDate?: string;
  endDate?: string;
}

export type UpdateBannerPayload = Partial<CreateBannerPayload> & { id: string };

// -- Blog -----------------------------------------------------------------

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt?: string;
  content: string;
  coverImageUrl?: string;
  authorId: string;
  authorName: string;
  tags?: string[];
  categoryId?: string;
  isPublished: boolean;
  publishedAt?: string;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBlogPostPayload {
  slug: string;
  title: string;
  excerpt?: string;
  content: string;
  coverImageUrl?: string;
  tags?: string[];
  categoryId?: string;
  isPublished?: boolean;
}

export type UpdateBlogPostPayload = Partial<CreateBlogPostPayload> & { id: string };

export interface BlogListParams {
  page?: number;
  perPage?: number;
  query?: string;
  tag?: string;
  categoryId?: string;
  isPublished?: boolean;
  authorId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// -- FAQ ------------------------------------------------------------------

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  categoryId?: string;
  sortOrder: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FaqCategory {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  items?: FaqItem[];
}

export interface CreateFaqPayload {
  question: string;
  answer: string;
  categoryId?: string;
  sortOrder?: number;
  isPublished?: boolean;
}

export type UpdateFaqPayload = Partial<CreateFaqPayload> & { id: string };

// -- SEO ------------------------------------------------------------------

export interface SeoSettings {
  defaultTitle: string;
  titleTemplate: string;
  defaultDescription: string;
  defaultKeywords: string[];
  ogImage?: string;
  twitterHandle?: string;
  googleAnalyticsId?: string;
  googleTagManagerId?: string;
  robotsTxt?: string;
  customHeadScripts?: string;
  structuredData?: Record<string, unknown>;
}

export type UpdateSeoSettingsPayload = Partial<SeoSettings>;

export class CmsApi extends BaseApiClient {
  // -- Pages --------------------------------------------------------------

  /**
   * List CMS pages.
   */
  async listPages(
    params?: { page?: number; perPage?: number; isPublished?: boolean },
  ): Promise<ApiResponse<PaginatedResponse<Page>>> {
    return this.get<PaginatedResponse<Page>>('/cms/pages', { params });
  }

  /**
   * Get a page by ID.
   */
  async getPageById(id: string): Promise<ApiResponse<Page>> {
    return this.get<Page>(`/cms/pages/${id}`);
  }

  /**
   * Get a page by slug (public).
   */
  async getPageBySlug(slug: string): Promise<ApiResponse<Page>> {
    return this.get<Page>(`/cms/pages/slug/${slug}`);
  }

  /**
   * Create a new page (admin only).
   */
  async createPage(payload: CreatePagePayload): Promise<ApiResponse<Page>> {
    return this.post<Page>('/cms/pages', payload);
  }

  /**
   * Update an existing page (admin only).
   */
  async updatePage({ id, ...payload }: UpdatePagePayload): Promise<ApiResponse<Page>> {
    return this.put<Page>(`/cms/pages/${id}`, payload);
  }

  /**
   * Delete a page (admin only).
   */
  async deletePage(id: string): Promise<ApiResponse<{ message: string }>> {
    return this.delete<{ message: string }>(`/cms/pages/${id}`);
  }

  // -- Banners ------------------------------------------------------------

  /**
   * List banners, optionally filtered by position.
   */
  async listBanners(
    params?: { position?: string; isActive?: boolean },
  ): Promise<ApiResponse<Banner[]>> {
    return this.get<Banner[]>('/cms/banners', { params });
  }

  /**
   * Get a banner by ID.
   */
  async getBannerById(id: string): Promise<ApiResponse<Banner>> {
    return this.get<Banner>(`/cms/banners/${id}`);
  }

  /**
   * Create a new banner (admin only).
   */
  async createBanner(payload: CreateBannerPayload): Promise<ApiResponse<Banner>> {
    return this.post<Banner>('/cms/banners', payload);
  }

  /**
   * Update an existing banner (admin only).
   */
  async updateBanner({ id, ...payload }: UpdateBannerPayload): Promise<ApiResponse<Banner>> {
    return this.put<Banner>(`/cms/banners/${id}`, payload);
  }

  /**
   * Delete a banner (admin only).
   */
  async deleteBanner(id: string): Promise<ApiResponse<{ message: string }>> {
    return this.delete<{ message: string }>(`/cms/banners/${id}`);
  }

  /**
   * Reorder banners (admin only).
   */
  async reorderBanners(
    orderedIds: string[],
  ): Promise<ApiResponse<{ message: string }>> {
    return this.post<{ message: string }>('/cms/banners/reorder', { orderedIds });
  }

  // -- Blog ---------------------------------------------------------------

  /**
   * List blog posts.
   */
  async listBlogPosts(
    params?: BlogListParams,
  ): Promise<ApiResponse<PaginatedResponse<BlogPost>>> {
    return this.get<PaginatedResponse<BlogPost>>('/cms/blog', { params });
  }

  /**
   * Get a blog post by ID.
   */
  async getBlogPostById(id: string): Promise<ApiResponse<BlogPost>> {
    return this.get<BlogPost>(`/cms/blog/${id}`);
  }

  /**
   * Get a blog post by slug (public).
   */
  async getBlogPostBySlug(slug: string): Promise<ApiResponse<BlogPost>> {
    return this.get<BlogPost>(`/cms/blog/slug/${slug}`);
  }

  /**
   * Create a new blog post (admin only).
   */
  async createBlogPost(payload: CreateBlogPostPayload): Promise<ApiResponse<BlogPost>> {
    return this.post<BlogPost>('/cms/blog', payload);
  }

  /**
   * Update an existing blog post (admin only).
   */
  async updateBlogPost({ id, ...payload }: UpdateBlogPostPayload): Promise<ApiResponse<BlogPost>> {
    return this.put<BlogPost>(`/cms/blog/${id}`, payload);
  }

  /**
   * Delete a blog post (admin only).
   */
  async deleteBlogPost(id: string): Promise<ApiResponse<{ message: string }>> {
    return this.delete<{ message: string }>(`/cms/blog/${id}`);
  }

  /**
   * Upload a cover image for a blog post.
   */
  async uploadBlogCoverImage(
    postId: string,
    formData: FormData,
    onProgress?: (percentage: number) => void,
  ): Promise<ApiResponse<{ coverImageUrl: string }>> {
    return this.upload<{ coverImageUrl: string }>(
      `/cms/blog/${postId}/cover-image`,
      formData,
      onProgress,
    );
  }

  // -- FAQ ----------------------------------------------------------------

  /**
   * List FAQ categories with their items.
   */
  async listFaqCategories(): Promise<ApiResponse<FaqCategory[]>> {
    return this.get<FaqCategory[]>('/cms/faq/categories');
  }

  /**
   * List FAQ items, optionally filtered by category.
   */
  async listFaqItems(
    params?: { categoryId?: string; isPublished?: boolean },
  ): Promise<ApiResponse<FaqItem[]>> {
    return this.get<FaqItem[]>('/cms/faq', { params });
  }

  /**
   * Get a FAQ item by ID.
   */
  async getFaqById(id: string): Promise<ApiResponse<FaqItem>> {
    return this.get<FaqItem>(`/cms/faq/${id}`);
  }

  /**
   * Create a new FAQ item (admin only).
   */
  async createFaq(payload: CreateFaqPayload): Promise<ApiResponse<FaqItem>> {
    return this.post<FaqItem>('/cms/faq', payload);
  }

  /**
   * Update an existing FAQ item (admin only).
   */
  async updateFaq({ id, ...payload }: UpdateFaqPayload): Promise<ApiResponse<FaqItem>> {
    return this.put<FaqItem>(`/cms/faq/${id}`, payload);
  }

  /**
   * Delete a FAQ item (admin only).
   */
  async deleteFaq(id: string): Promise<ApiResponse<{ message: string }>> {
    return this.delete<{ message: string }>(`/cms/faq/${id}`);
  }

  /**
   * Reorder FAQ items within a category (admin only).
   */
  async reorderFaqItems(
    categoryId: string,
    orderedIds: string[],
  ): Promise<ApiResponse<{ message: string }>> {
    return this.post<{ message: string }>(`/cms/faq/categories/${categoryId}/reorder`, {
      orderedIds,
    });
  }

  /**
   * Create a FAQ category (admin only).
   */
  async createFaqCategory(
    payload: { name: string; slug: string; sortOrder?: number },
  ): Promise<ApiResponse<FaqCategory>> {
    return this.post<FaqCategory>('/cms/faq/categories', payload);
  }

  /**
   * Update a FAQ category (admin only).
   */
  async updateFaqCategory(
    id: string,
    payload: { name?: string; slug?: string; sortOrder?: number },
  ): Promise<ApiResponse<FaqCategory>> {
    return this.put<FaqCategory>(`/cms/faq/categories/${id}`, payload);
  }

  /**
   * Delete a FAQ category (admin only).
   */
  async deleteFaqCategory(id: string): Promise<ApiResponse<{ message: string }>> {
    return this.delete<{ message: string }>(`/cms/faq/categories/${id}`);
  }

  // -- SEO Settings -------------------------------------------------------

  /**
   * Get global SEO settings.
   */
  async getSeoSettings(): Promise<ApiResponse<SeoSettings>> {
    return this.get<SeoSettings>('/cms/seo');
  }

  /**
   * Update global SEO settings (admin only).
   */
  async updateSeoSettings(
    payload: UpdateSeoSettingsPayload,
  ): Promise<ApiResponse<SeoSettings>> {
    return this.put<SeoSettings>('/cms/seo', payload);
  }

  /**
   * Get SEO metadata for a specific page/route.
   */
  async getPageSeo(
    slug: string,
  ): Promise<
    ApiResponse<{
      title: string;
      description: string;
      keywords: string[];
      ogImage?: string;
      canonicalUrl?: string;
      structuredData?: Record<string, unknown>;
    }>
  > {
    return this.get(`/cms/seo/page/${slug}`);
  }

  /**
   * Generate sitemap (admin only).
   */
  async generateSitemap(): Promise<ApiResponse<{ sitemapUrl: string; message: string }>> {
    return this.post<{ sitemapUrl: string; message: string }>('/cms/seo/sitemap/generate');
  }
}
