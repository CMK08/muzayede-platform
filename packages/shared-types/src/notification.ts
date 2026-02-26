// ---------------------------------------------------------------------------
// Notification Domain Types
// ---------------------------------------------------------------------------

import type { BaseEntity } from './common';

/** Delivery channel for notifications */
export type NotificationChannel = 'in_app' | 'email' | 'sms' | 'push' | 'webhook';

/** Semantic notification type */
export type NotificationType =
  | 'auction_start'
  | 'auction_end'
  | 'auction_cancelled'
  | 'bid_placed'
  | 'bid_outbid'
  | 'bid_won'
  | 'bid_lost'
  | 'payment_received'
  | 'payment_failed'
  | 'order_shipped'
  | 'order_delivered'
  | 'kyc_approved'
  | 'kyc_rejected'
  | 'new_message'
  | 'price_drop'
  | 'watchlist_update'
  | 'system_announcement'
  | 'security_alert';

/** Priority level */
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

/** Core notification entity */
export interface Notification extends BaseEntity {
  userId: string;
  type: NotificationType;
  channel: NotificationChannel;
  priority: NotificationPriority;
  title: string;
  body: string;
  imageUrl?: string;
  actionUrl?: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  readAt?: string;
  sentAt?: string;
  expiresAt?: string;
}

/** Per-type channel preference */
export interface NotificationPreference {
  userId: string;
  type: NotificationType;
  channels: {
    inApp: boolean;
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  /** Quiet-hours: suppress non-urgent notifications between these times */
  quietHoursStart?: string;
  quietHoursEnd?: string;
  timezone?: string;
}

/** Bulk notification batch record */
export interface NotificationBatch extends BaseEntity {
  title: string;
  body: string;
  type: NotificationType;
  channel: NotificationChannel;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  status: 'queued' | 'sending' | 'completed' | 'failed';
  scheduledAt?: string;
  completedAt?: string;
}
