import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { SmsService } from '../sms/sms.service';
import { PushService } from '../push/push.service';
import { NotificationChannel, Prisma } from '@prisma/client';

type ChannelInput = 'email' | 'sms' | 'push' | 'in_app';

function mapChannelToEnum(channel: ChannelInput): NotificationChannel {
  const mapping: Record<ChannelInput, NotificationChannel> = {
    email: NotificationChannel.EMAIL,
    sms: NotificationChannel.SMS,
    push: NotificationChannel.PUSH,
    in_app: NotificationChannel.IN_APP,
  };
  return mapping[channel];
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly smsService: SmsService,
    private readonly pushService: PushService,
  ) {}

  async send(
    userId: string,
    type: string,
    channels: ChannelInput[],
    data: Record<string, any>,
  ): Promise<{ notificationIds: string[]; channels: string[] }> {
    this.logger.log(
      `Sending notification: type=${type}, user=${userId}, channels=[${channels.join(', ')}]`,
    );

    // Check user notification preferences
    const preferences = await this.prisma.notificationPreference.findUnique({
      where: { userId_type: { userId, type } },
    });

    // Filter channels based on user preferences
    const allowedChannels = channels.filter((channel) => {
      if (!preferences) return true; // No preferences means all channels are allowed
      switch (channel) {
        case 'email':
          return preferences.emailEnabled;
        case 'sms':
          return preferences.smsEnabled;
        case 'push':
          return preferences.pushEnabled;
        case 'in_app':
          return true; // In-app is always allowed
        default:
          return true;
      }
    });

    // Build notification title and body from type and data
    const { title, body } = this.buildNotificationContent(type, data);

    const notificationIds: string[] = [];
    const sentChannels: string[] = [];

    // Create a notification record for each channel and dispatch
    const deliveryPromises = allowedChannels.map(async (channel) => {
      try {
        // Create notification record in DB
        const notification = await this.prisma.notification.create({
          data: {
            userId,
            type,
            channel: mapChannelToEnum(channel),
            title,
            body,
            dataJson: data as Prisma.JsonObject,
            imageUrl: data.imageUrl || null,
            actionUrl: data.actionUrl || null,
            isRead: false,
          },
        });

        notificationIds.push(notification.id);

        // Dispatch to the channel handler
        await this.dispatchToChannel(channel, userId, type, data);
        sentChannels.push(channel);

        this.logger.debug(
          `Notification sent via ${channel}: id=${notification.id}`,
        );
      } catch (error: any) {
        this.logger.error(
          `Failed to send notification via ${channel}: ${error.message}`,
        );
      }
    });

    await Promise.allSettled(deliveryPromises);

    return {
      notificationIds,
      channels: sentChannels,
    };
  }

  async getUserNotifications(
    userId: string,
    query: {
      page: number;
      limit: number;
      unreadOnly: boolean;
      type?: string;
      channel?: string;
    },
  ) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.NotificationWhereInput = {
      userId,
    };

    if (query.unreadOnly) {
      where.isRead = false;
    }

    if (query.type) {
      where.type = query.type;
    }

    if (query.channel) {
      where.channel = mapChannelToEnum(query.channel as ChannelInput);
    }

    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { sentAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({
        where: { userId, isRead: false },
      }),
    ]);

    return {
      data: notifications.map((n) => ({
        id: n.id,
        type: n.type,
        channel: n.channel,
        title: n.title,
        body: n.body,
        data: n.dataJson,
        imageUrl: n.imageUrl,
        actionUrl: n.actionUrl,
        isRead: n.isRead,
        sentAt: n.sentAt,
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        unreadCount,
      },
    };
  }

  async markAsRead(
    notificationId: string,
    userId: string,
  ): Promise<{ message: string }> {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.userId !== userId) {
      throw new ForbiddenException(
        'You can only mark your own notifications as read',
      );
    }

    await this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });

    this.logger.log(`Notification marked as read: ${notificationId}`);
    return { message: 'Notification marked as read' };
  }

  async markAllAsRead(userId: string): Promise<{ message: string; count: number }> {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: { isRead: true },
    });

    this.logger.log(
      `All notifications marked as read for user: ${userId}, count: ${result.count}`,
    );
    return { message: 'All notifications marked as read', count: result.count };
  }

  async getUnreadCount(userId: string): Promise<{ count: number }> {
    const count = await this.prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });

    return { count };
  }

  async setPreferences(
    userId: string,
    type: string,
    preferences: {
      emailEnabled?: boolean;
      smsEnabled?: boolean;
      pushEnabled?: boolean;
    },
  ) {
    const pref = await this.prisma.notificationPreference.upsert({
      where: { userId_type: { userId, type } },
      update: {
        emailEnabled: preferences.emailEnabled ?? undefined,
        smsEnabled: preferences.smsEnabled ?? undefined,
        pushEnabled: preferences.pushEnabled ?? undefined,
      },
      create: {
        userId,
        type,
        emailEnabled: preferences.emailEnabled ?? true,
        smsEnabled: preferences.smsEnabled ?? false,
        pushEnabled: preferences.pushEnabled ?? true,
      },
    });

    return pref;
  }

  async getPreferences(userId: string) {
    const preferences = await this.prisma.notificationPreference.findMany({
      where: { userId },
    });

    return {
      data: preferences.map((p) => ({
        id: p.id,
        type: p.type,
        emailEnabled: p.emailEnabled,
        smsEnabled: p.smsEnabled,
        pushEnabled: p.pushEnabled,
      })),
    };
  }

  private async dispatchToChannel(
    channel: ChannelInput,
    userId: string,
    type: string,
    data: Record<string, any>,
  ): Promise<void> {
    switch (channel) {
      case 'email':
        await this.emailService.sendTemplatedEmail(userId, type, data);
        break;
      case 'sms':
        await this.smsService.sendSms(userId, type, data);
        break;
      case 'push':
        await this.pushService.sendPushNotification(userId, type, data);
        break;
      case 'in_app':
        // In-app notifications are stored in database and served via the GET API
        this.logger.debug(`In-app notification stored for user: ${userId}`);
        break;
    }
  }

  private buildNotificationContent(
    type: string,
    data: Record<string, any>,
  ): { title: string; body: string } {
    const templates: Record<string, { title: string; body: string }> = {
      bid_placed: {
        title: 'Yeni Teklif',
        body: `"${data.auctionTitle || 'Muzayede'}" icin ${data.bidAmount || ''} TL teklif verildi.`,
      },
      bid_outbid: {
        title: 'Teklifiniz Gecildi',
        body: `"${data.auctionTitle || 'Muzayede'}" icin teklifiniz gecildi. Yeni fiyat: ${data.currentPrice || ''} TL.`,
      },
      auction_won: {
        title: 'Tebrikler! Muzayedeyi Kazandiniz',
        body: `"${data.auctionTitle || 'Muzayede'}" muzayedesini ${data.winningAmount || ''} TL ile kazandiniz!`,
      },
      auction_ended: {
        title: 'Muzayede Sona Erdi',
        body: `"${data.auctionTitle || 'Muzayede'}" muzayedesi sona erdi.`,
      },
      auction_starting_soon: {
        title: 'Muzayede Basliyor',
        body: `"${data.auctionTitle || 'Muzayede'}" ${data.startsIn || ''} dakika icinde basliyor!`,
      },
      welcome: {
        title: 'Muzayede Platformuna Hosgeldiniz!',
        body: 'Hesabiniz basariyla olusturuldu. Muzayedeleri kesfetmeye baslayin!',
      },
      password_reset: {
        title: 'Sifre Sifirlama',
        body: 'Sifre sifirlama talebiniz alindi. Baglantiya tiklayarak yeni sifrenizi belirleyin.',
      },
      payment_received: {
        title: 'Odeme Onaylandi',
        body: `${data.amount || ''} TL odemeniz basariyla alindi.`,
      },
      shipping_update: {
        title: 'Kargo Guncelleme',
        body: `Siparisinisin kargo durumu guncellendi: ${data.shipmentStatus || ''}.`,
      },
    };

    const template = templates[type];
    if (template) {
      return template;
    }

    return {
      title: data.title || 'Muzayede Bildirim',
      body: data.message || 'Yeni bir bildiriminiz var.',
    };
  }
}
