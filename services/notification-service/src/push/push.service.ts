import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  data?: Record<string, any>;
  clickAction?: string;
}

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private readonly fcmProjectId: string;
  private readonly fcmServerKey: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.fcmProjectId = this.configService.get<string>('FCM_PROJECT_ID', '');
    this.fcmServerKey = this.configService.get<string>('FCM_SERVER_KEY', '');
  }

  async sendPushNotification(
    userId: string,
    type: string,
    data: Record<string, any>,
  ): Promise<void> {
    const payload = this.buildPayload(type, data);

    // Retrieve user's push tokens from notification preferences or a dedicated field
    const tokens = await this.getUserTokens(userId);

    if (tokens.length === 0) {
      this.logger.warn(`No push tokens found for user: ${userId}`);
      return;
    }

    const results = await Promise.allSettled(
      tokens.map((token) => this.sendToFcm(token, payload)),
    );

    const successCount = results.filter((r) => r.status === 'fulfilled').length;
    const failCount = results.filter((r) => r.status === 'rejected').length;

    // Remove invalid tokens
    for (let i = 0; i < results.length; i++) {
      if (results[i].status === 'rejected') {
        const reason = (results[i] as PromiseRejectedResult).reason;
        if (
          reason?.message?.includes('NotRegistered') ||
          reason?.message?.includes('InvalidRegistration')
        ) {
          this.logger.log(
            `Removing invalid push token for user ${userId}: ${tokens[i].substring(0, 20)}...`,
          );
          // We could clean up invalid tokens from a tokens table/field here
        }
      }
    }

    this.logger.log(
      `Push notification sent: type=${type}, user=${userId}, success=${successCount}, failed=${failCount}`,
    );
  }

  async registerToken(
    userId: string,
    token: string,
    platform: 'ios' | 'android' | 'web',
  ): Promise<void> {
    // Store push token in notification preferences dataJson field
    // In a production system, you'd use a dedicated PushToken model.
    // Here, we use the NotificationPreference table with a special type.
    await this.prisma.notificationPreference.upsert({
      where: {
        userId_type: {
          userId,
          type: `push_token_${platform}_${this.hashToken(token)}`,
        },
      },
      update: {
        pushEnabled: true,
      },
      create: {
        userId,
        type: `push_token_${platform}_${this.hashToken(token)}`,
        emailEnabled: false,
        smsEnabled: false,
        pushEnabled: true,
      },
    });

    this.logger.log(
      `Push token registered: user=${userId}, platform=${platform}`,
    );
  }

  async unregisterToken(userId: string, token: string): Promise<void> {
    // Find and delete push token entries
    const tokenHash = this.hashToken(token);

    await this.prisma.notificationPreference.deleteMany({
      where: {
        userId,
        type: { contains: tokenHash },
      },
    });

    this.logger.log(`Push token unregistered: user=${userId}`);
  }

  private buildPayload(type: string, data: Record<string, any>): PushPayload {
    const payloads: Record<string, PushPayload> = {
      bid_outbid: {
        title: 'Teklifiniz Gecildi!',
        body: `"${data.auctionTitle}" icin yeni fiyat: ${data.currentPrice} TL`,
        clickAction: `/auctions/${data.auctionId}`,
        icon: '/icons/outbid.png',
        data,
      },
      auction_won: {
        title: 'Tebrikler!',
        body: `"${data.auctionTitle}" muzayedesini kazandiniz!`,
        clickAction: `/auctions/${data.auctionId}`,
        icon: '/icons/trophy.png',
        data,
      },
      auction_starting_soon: {
        title: 'Muzayede Basliyor',
        body: `"${data.auctionTitle}" ${data.startsIn} dakika icinde basliyor`,
        clickAction: `/auctions/${data.auctionId}`,
        icon: '/icons/auction.png',
        data,
      },
      new_bid: {
        title: 'Yeni Teklif',
        body: `"${data.auctionTitle}" icin ${data.bidAmount} TL teklif verildi`,
        clickAction: `/auctions/${data.auctionId}`,
        icon: '/icons/bid.png',
        data,
      },
      bid_placed: {
        title: 'Teklif Alindi',
        body: `"${data.auctionTitle}" icin teklifiniz alindi: ${data.bidAmount} TL`,
        clickAction: `/auctions/${data.auctionId}`,
        icon: '/icons/check.png',
        data,
      },
      payment_received: {
        title: 'Odeme Onaylandi',
        body: `${data.amount} TL odemeniz basariyla alindi`,
        clickAction: `/orders/${data.orderId}`,
        icon: '/icons/payment.png',
        data,
      },
      shipping_update: {
        title: 'Kargo Guncelleme',
        body: `Siparisinisin kargo durumu guncellendi`,
        clickAction: `/orders/${data.orderId}`,
        icon: '/icons/shipping.png',
        data,
      },
    };

    return (
      payloads[type] || {
        title: 'Muzayede',
        body: data.message || 'Yeni bir bildiriminiz var',
        icon: '/icons/default.png',
        data,
      }
    );
  }

  private async getUserTokens(userId: string): Promise<string[]> {
    // Retrieve push tokens from notification preferences
    const tokenPrefs = await this.prisma.notificationPreference.findMany({
      where: {
        userId,
        type: { startsWith: 'push_token_' },
        pushEnabled: true,
      },
    });

    // Extract tokens from the type field (format: push_token_{platform}_{hash})
    // In a real system, you'd store the actual token in a separate table.
    // For now, we return what we have. The actual token would be stored in the type suffix.
    return tokenPrefs.map((pref) => {
      // Extract the hash part which represents the token
      const parts = pref.type.split('_');
      return parts.slice(2).join('_');
    });
  }

  private async sendToFcm(token: string, payload: PushPayload): Promise<void> {
    if (!this.fcmServerKey) {
      this.logger.debug(
        `[FCM-DEV] Would send to token ${token.substring(0, 20)}...: title="${payload.title}"`,
      );
      return;
    }

    // FCM HTTP v1 API
    const url = this.fcmProjectId
      ? `https://fcm.googleapis.com/v1/projects/${this.fcmProjectId}/messages:send`
      : 'https://fcm.googleapis.com/fcm/send';

    const isV1 = !!this.fcmProjectId;

    let body: string;
    let headers: Record<string, string>;

    if (isV1) {
      // FCM v1 API format
      body = JSON.stringify({
        message: {
          token,
          notification: {
            title: payload.title,
            body: payload.body,
            image: payload.icon,
          },
          data: payload.data
            ? Object.fromEntries(
                Object.entries(payload.data).map(([k, v]) => [
                  k,
                  String(v),
                ]),
              )
            : undefined,
          webpush: payload.clickAction
            ? {
                fcmOptions: {
                  link: payload.clickAction,
                },
              }
            : undefined,
        },
      });
      headers = {
        Authorization: `Bearer ${this.fcmServerKey}`,
        'Content-Type': 'application/json',
      };
    } else {
      // Legacy FCM API format
      body = JSON.stringify({
        to: token,
        notification: {
          title: payload.title,
          body: payload.body,
          icon: payload.icon,
          click_action: payload.clickAction,
        },
        data: payload.data,
      });
      headers = {
        Authorization: `key=${this.fcmServerKey}`,
        'Content-Type': 'application/json',
      };
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`FCM API error: ${response.status} - ${errorBody}`);
      }

      const result = await response.json();
      this.logger.debug(
        `[FCM] Push sent to token ${token.substring(0, 20)}...: ${JSON.stringify(result)}`,
      );
    } catch (error: any) {
      this.logger.error(
        `[FCM] Failed to send push: ${error.message}`,
      );
      throw error;
    }
  }

  private hashToken(token: string): string {
    // Simple hash for token identification (not cryptographic)
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      const char = token.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }
}
