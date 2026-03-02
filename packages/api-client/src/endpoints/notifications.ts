// ---------------------------------------------------------------------------
// Notification API Endpoints
// ---------------------------------------------------------------------------

import type { ApiResponse, PaginatedResponse } from '@muzayede/shared-types';
import { BaseApiClient } from '../client';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export type NotificationType =
  | 'bid_outbid'
  | 'bid_won'
  | 'auction_starting'
  | 'auction_ending'
  | 'auction_cancelled'
  | 'payment_received'
  | 'payment_failed'
  | 'shipping_update'
  | 'kyc_approved'
  | 'kyc_rejected'
  | 'system'
  | 'promotional';

export interface NotificationListParams {
  page?: number;
  perPage?: number;
  isRead?: boolean;
  type?: NotificationType;
  fromDate?: string;
  toDate?: string;
}

export interface NotificationPreferences {
  email: {
    bidOutbid: boolean;
    bidWon: boolean;
    auctionStarting: boolean;
    auctionEnding: boolean;
    paymentReceived: boolean;
    shippingUpdate: boolean;
    promotional: boolean;
    newsletter: boolean;
  };
  push: {
    bidOutbid: boolean;
    bidWon: boolean;
    auctionStarting: boolean;
    auctionEnding: boolean;
    paymentReceived: boolean;
    shippingUpdate: boolean;
    promotional: boolean;
  };
  sms: {
    bidWon: boolean;
    paymentReceived: boolean;
    shippingUpdate: boolean;
  };
}

export type UpdateNotificationPreferencesPayload = Partial<NotificationPreferences>;

export interface NewsletterSubscribePayload {
  email: string;
  categories?: string[];
  language?: string;
}

export class NotificationApi extends BaseApiClient {
  /**
   * List notifications for the current user.
   */
  async list(
    params?: NotificationListParams,
  ): Promise<ApiResponse<PaginatedResponse<Notification>>> {
    return this.get<PaginatedResponse<Notification>>('/notifications', { params });
  }

  /**
   * Get a single notification by ID.
   */
  async getById(id: string): Promise<ApiResponse<Notification>> {
    return this.get<Notification>(`/notifications/${id}`);
  }

  /**
   * Get unread notification count.
   */
  async getUnreadCount(): Promise<ApiResponse<{ count: number }>> {
    return this.get<{ count: number }>('/notifications/unread-count');
  }

  /**
   * Mark a single notification as read.
   */
  async markAsRead(id: string): Promise<ApiResponse<{ message: string }>> {
    return this.post<{ message: string }>(`/notifications/${id}/read`);
  }

  /**
   * Mark multiple notifications as read.
   */
  async markManyAsRead(ids: string[]): Promise<ApiResponse<{ message: string }>> {
    return this.post<{ message: string }>('/notifications/mark-read', { ids });
  }

  /**
   * Mark all notifications as read.
   */
  async markAllAsRead(): Promise<ApiResponse<{ message: string }>> {
    return this.post<{ message: string }>('/notifications/mark-all-read');
  }

  /**
   * Delete a notification.
   */
  async remove(id: string): Promise<ApiResponse<{ message: string }>> {
    return this.delete<{ message: string }>(`/notifications/${id}`);
  }

  /**
   * Delete all notifications for the current user.
   */
  async removeAll(): Promise<ApiResponse<{ message: string }>> {
    return this.delete<{ message: string }>('/notifications');
  }

  /**
   * Get notification preferences.
   */
  async getPreferences(): Promise<ApiResponse<NotificationPreferences>> {
    return this.get<NotificationPreferences>('/notifications/preferences');
  }

  /**
   * Update notification preferences.
   */
  async updatePreferences(
    payload: UpdateNotificationPreferencesPayload,
  ): Promise<ApiResponse<NotificationPreferences>> {
    return this.put<NotificationPreferences>('/notifications/preferences', payload);
  }

  /**
   * Register a device for push notifications.
   */
  async registerDevice(
    token: string,
    platform: 'web' | 'ios' | 'android',
  ): Promise<ApiResponse<{ message: string }>> {
    return this.post<{ message: string }>('/notifications/devices', { token, platform });
  }

  /**
   * Unregister a device from push notifications.
   */
  async unregisterDevice(token: string): Promise<ApiResponse<{ message: string }>> {
    return this.delete<{ message: string }>('/notifications/devices', {
      data: { token },
    });
  }

  /**
   * Subscribe to the newsletter.
   */
  async subscribeNewsletter(
    payload: NewsletterSubscribePayload,
  ): Promise<ApiResponse<{ message: string }>> {
    return this.post<{ message: string }>('/notifications/newsletter/subscribe', payload);
  }

  /**
   * Unsubscribe from the newsletter.
   */
  async unsubscribeNewsletter(token: string): Promise<ApiResponse<{ message: string }>> {
    return this.post<{ message: string }>('/notifications/newsletter/unsubscribe', { token });
  }
}
