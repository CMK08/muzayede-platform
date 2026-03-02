import {
  Injectable,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ChatMessage {
  id: string;
  auctionId: string;
  userId: string;
  username: string;
  message: string;
  type: 'message' | 'system' | 'bid_notification' | 'auctioneer_call';
  timestamp: Date;
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  /** In-memory message store per auction, kept in a rolling buffer */
  private readonly messageStore = new Map<string, ChatMessage[]>();
  private readonly MAX_MESSAGES_PER_AUCTION = 500;

  /** Rate limiting: userId -> last message timestamp */
  private readonly rateLimitMap = new Map<string, number>();
  private readonly RATE_LIMIT_MS = 3000;

  /** Muted users: `${auctionId}:${userId}` -> mute expiry timestamp */
  private readonly mutedUsers = new Map<string, number>();

  /** Turkish profanity filter word list */
  private readonly profanityList: string[] = [
    'amk', 'aq', 'orospu', 'piç', 'pic', 'siktir', 'sikerim',
    'gotten', 'yarrak', 'yarak', 'meme', 'sik', 'am', 'gavat',
    'ibne', 'puşt', 'pezevenk', 'kahpe', 'kaltak', 'dangalak',
    'hıyar', 'salak', 'gerizekalı', 'aptal', 'mal', 'bok',
  ];

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Send a chat message in an auction room.
   * 1. Validate auction has active LiveSession
   * 2. Basic profanity filter (Turkish bad words)
   * 3. Rate limit: max 1 message per 3 seconds per user
   * 4. Return message object for broadcasting
   */
  async sendMessage(
    auctionId: string,
    userId: string,
    message: string,
  ): Promise<ChatMessage> {
    const session = await this.prisma.liveSession.findUnique({
      where: { auctionId },
    });

    if (!session || session.status !== 'live') {
      throw new BadRequestException(
        'Canli oturum aktif degil. Mesaj gonderilemiyor.',
      );
    }

    const muteKey = `${auctionId}:${userId}`;
    const muteExpiry = this.mutedUsers.get(muteKey);
    if (muteExpiry && Date.now() < muteExpiry) {
      const remainingSeconds = Math.ceil((muteExpiry - Date.now()) / 1000);
      throw new BadRequestException(
        `Susturulmus durumdasiniz. ${remainingSeconds} saniye kaldi.`,
      );
    }
    if (muteExpiry && Date.now() >= muteExpiry) {
      this.mutedUsers.delete(muteKey);
    }

    const lastMessageTime = this.rateLimitMap.get(userId);
    if (lastMessageTime && Date.now() - lastMessageTime < this.RATE_LIMIT_MS) {
      throw new BadRequestException(
        'Cok hizli mesaj gonderiyorsunuz. Lutfen bekleyin.',
      );
    }

    const filteredMessage = this.filterProfanity(message);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    const username = user?.profile?.displayName ||
      (user?.profile
        ? `${user.profile.firstName} ${user.profile.lastName.charAt(0)}.`
        : `Kullanici_${userId.substring(0, 6)}`);

    const chatMessage: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      auctionId,
      userId,
      username,
      message: filteredMessage,
      type: 'message',
      timestamp: new Date(),
    };

    this.rateLimitMap.set(userId, Date.now());

    const messages = this.messageStore.get(auctionId) || [];
    messages.push(chatMessage);

    if (messages.length > this.MAX_MESSAGES_PER_AUCTION) {
      messages.splice(0, messages.length - this.MAX_MESSAGES_PER_AUCTION);
    }
    this.messageStore.set(auctionId, messages);

    return chatMessage;
  }

  /**
   * Get recent messages for an auction.
   */
  getRecentMessages(auctionId: string, limit = 50): ChatMessage[] {
    const messages = this.messageStore.get(auctionId) || [];
    return messages.slice(-limit);
  }

  /**
   * Mute a user in an auction chat.
   */
  async muteUser(
    auctionId: string,
    userId: string,
    adminId: string,
    durationMinutes: number,
  ) {
    this.logger.log(
      `Muting user ${userId} in auction ${auctionId} for ${durationMinutes} minutes by admin ${adminId}`,
    );

    const muteKey = `${auctionId}:${userId}`;
    const expiresAt = Date.now() + durationMinutes * 60 * 1000;
    this.mutedUsers.set(muteKey, expiresAt);

    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'chat.user_muted',
        entityType: 'User',
        entityId: userId,
        metadata: {
          auctionId,
          mutedUserId: userId,
          durationMinutes,
          expiresAt: new Date(expiresAt).toISOString(),
        },
      },
    });

    return {
      event: 'user.muted',
      auctionId,
      userId,
      mutedBy: adminId,
      durationMinutes,
      expiresAt: new Date(expiresAt).toISOString(),
    };
  }

  /**
   * Unmute a user.
   */
  unmuteUser(auctionId: string, userId: string) {
    const muteKey = `${auctionId}:${userId}`;
    this.mutedUsers.delete(muteKey);

    return {
      event: 'user.unmuted',
      auctionId,
      userId,
    };
  }

  /**
   * Basic Turkish profanity filter.
   * Replaces bad words with asterisks.
   */
  private filterProfanity(message: string): string {
    let filtered = message;
    const lowerMessage = message.toLowerCase();

    for (const word of this.profanityList) {
      const regex = new RegExp(`\\b${this.escapeRegex(word)}\\b`, 'gi');
      if (regex.test(lowerMessage)) {
        filtered = filtered.replace(regex, '*'.repeat(word.length));
      }
    }

    return filtered;
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
