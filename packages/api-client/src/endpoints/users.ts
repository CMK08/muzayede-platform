// ---------------------------------------------------------------------------
// User API Endpoints
// ---------------------------------------------------------------------------

import type {
  ApiResponse,
  PaginatedResponse,
  User,
  UserProfile,
  UserSummary,
  KycStatus,
} from '@muzayede/shared-types';
import { BaseApiClient } from '../client';

export interface UserListParams {
  page?: number;
  perPage?: number;
  query?: string;
  role?: string;
  kycStatus?: KycStatus;
  isBanned?: boolean;
}

export interface UpdateProfilePayload {
  displayName?: string;
  bio?: string;
  companyName?: string;
  phone?: string;
  dateOfBirth?: string;
  address?: {
    street: string;
    city: string;
    state?: string;
    postalCode: string;
    country: string;
  };
  preferredLanguage?: string;
  theme?: 'light' | 'dark' | 'system';
  notificationEmail?: string;
  website?: string;
  socialLinks?: {
    instagram?: string;
    twitter?: string;
    linkedin?: string;
  };
}

export interface KycSubmitPayload {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  nationality: string;
  idType: 'tc_kimlik' | 'passport' | 'driver_license' | 'residence_permit';
  idNumber: string;
  tckn?: string;
  taxId?: string;
  address: {
    street: string;
    city: string;
    state?: string;
    postalCode: string;
    country: string;
  };
  idFrontImageUrl: string;
  idBackImageUrl?: string;
  selfieImageUrl: string;
  consentGiven: true;
}

export class UserApi extends BaseApiClient {
  /**
   * Get a user by ID (public profile).
   */
  async getById(id: string): Promise<ApiResponse<UserSummary>> {
    return this.get<UserSummary>(`/users/${id}`);
  }

  /**
   * Get a user by username (public profile).
   */
  async getByUsername(username: string): Promise<ApiResponse<UserSummary>> {
    return this.get<UserSummary>(`/users/username/${username}`);
  }

  /**
   * Update the current user's profile.
   */
  async updateProfile(payload: UpdateProfilePayload): Promise<ApiResponse<UserProfile>> {
    return this.put<UserProfile>('/users/me/profile', payload);
  }

  /**
   * Upload a new avatar image.
   */
  async uploadAvatar(
    formData: FormData,
    onProgress?: (percentage: number) => void,
  ): Promise<ApiResponse<{ avatarUrl: string }>> {
    return this.upload<{ avatarUrl: string }>('/users/me/avatar', formData, onProgress);
  }

  /**
   * Submit KYC (identity verification) documents.
   */
  async submitKyc(payload: KycSubmitPayload): Promise<ApiResponse<{ status: KycStatus }>> {
    return this.post<{ status: KycStatus }>('/users/me/kyc', payload);
  }

  /**
   * Get the current user's KYC status.
   */
  async getKycStatus(): Promise<ApiResponse<{ status: KycStatus; rejectionReason?: string }>> {
    return this.get('/users/me/kyc');
  }

  /**
   * Change password (requires current password).
   */
  async changePassword(
    currentPassword: string,
    newPassword: string,
  ): Promise<ApiResponse<{ message: string }>> {
    return this.post<{ message: string }>('/users/me/password', {
      currentPassword,
      newPassword,
    });
  }

  /**
   * Get the user's watchlist (auctions being watched).
   */
  async getWatchlist(params?: {
    page?: number;
    perPage?: number;
  }): Promise<ApiResponse<PaginatedResponse<{ auctionId: string; addedAt: string }>>> {
    return this.get('/users/me/watchlist', { params });
  }

  /**
   * Get the user's won auctions.
   */
  async getWonAuctions(params?: {
    page?: number;
    perPage?: number;
  }): Promise<ApiResponse<PaginatedResponse<{ auctionId: string; wonAt: string; amount: number }>>> {
    return this.get('/users/me/won-auctions', { params });
  }

  // -- Admin endpoints ---------------------------------------------------

  /**
   * List all users (admin only).
   */
  async list(params?: UserListParams): Promise<ApiResponse<PaginatedResponse<User>>> {
    return this.get<PaginatedResponse<User>>('/admin/users', { params });
  }

  /**
   * Ban a user (admin only).
   */
  async ban(
    userId: string,
    reason: string,
  ): Promise<ApiResponse<{ message: string }>> {
    return this.post<{ message: string }>(`/admin/users/${userId}/ban`, { reason });
  }

  /**
   * Unban a user (admin only).
   */
  async unban(userId: string): Promise<ApiResponse<{ message: string }>> {
    return this.post<{ message: string }>(`/admin/users/${userId}/unban`);
  }

  /**
   * Approve KYC for a user (admin only).
   */
  async approveKyc(userId: string): Promise<ApiResponse<{ message: string }>> {
    return this.post<{ message: string }>(`/admin/users/${userId}/kyc/approve`);
  }

  /**
   * Reject KYC for a user (admin only).
   */
  async rejectKyc(
    userId: string,
    reason: string,
  ): Promise<ApiResponse<{ message: string }>> {
    return this.post<{ message: string }>(`/admin/users/${userId}/kyc/reject`, { reason });
  }
}
