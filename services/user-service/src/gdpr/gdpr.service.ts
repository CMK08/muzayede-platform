import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GdprService {
  private readonly logger = new Logger(GdprService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Export all user data as JSON (KVKK Article 11 / GDPR Article 15 - Right of Access)
   * Returns all user data: profile, bids, orders, favorites, notifications
   */
  async exportUserData(userId: string) {
    this.logger.log(`Exporting data for user: ${userId}`);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        sellerProfile: true,
        badges: true,
        kycDocuments: {
          select: {
            id: true,
            documentType: true,
            status: true,
            reviewNote: true,
            reviewedAt: true,
            createdAt: true,
          },
        },
        bids: {
          select: {
            id: true,
            auctionId: true,
            amount: true,
            type: true,
            isWinning: true,
            createdAt: true,
          },
        },
        buyerOrders: {
          select: {
            id: true,
            orderNumber: true,
            auctionId: true,
            hammerPrice: true,
            totalAmount: true,
            status: true,
            createdAt: true,
          },
        },
        sellerOrders: {
          select: {
            id: true,
            orderNumber: true,
            auctionId: true,
            hammerPrice: true,
            totalAmount: true,
            status: true,
            createdAt: true,
          },
        },
        favorites: {
          select: {
            id: true,
            productId: true,
            createdAt: true,
          },
        },
        notifications: {
          select: {
            id: true,
            type: true,
            channel: true,
            title: true,
            body: true,
            isRead: true,
            sentAt: true,
          },
        },
        notificationPreferences: {
          select: {
            id: true,
            type: true,
            emailEnabled: true,
            smsEnabled: true,
            pushEnabled: true,
          },
        },
        auctionFollows: {
          select: {
            id: true,
            auctionId: true,
            createdAt: true,
          },
        },
        blacklistEntries: {
          select: {
            id: true,
            reason: true,
            createdAt: true,
            expiresAt: true,
          },
        },
      },
      omit: {
        passwordHash: true,
        twoFactorSecret: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Log data export in audit log
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'user.data_exported',
        entityType: 'User',
        entityId: userId,
        metadata: {
          exportedAt: new Date().toISOString(),
          reason: 'KVKK/GDPR data access request',
        },
      },
    });

    return {
      exportDate: new Date().toISOString(),
      dataSubject: {
        id: user.id,
        email: user.email,
        phone: user.phone,
      },
      userData: user,
    };
  }

  /**
   * Freeze user data processing (KVKK Article 11 / GDPR Article 18 - Right to Restriction)
   * Sets isActive=false and adds a freeze flag via audit log
   */
  async freezeUserData(userId: string) {
    this.logger.log(`Freezing data processing for user: ${userId}`);

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    if (!user.isActive) {
      throw new ForbiddenException(`User ${userId} data processing is already frozen`);
    }

    await this.prisma.$transaction([
      // Deactivate user to stop all data processing
      this.prisma.user.update({
        where: { id: userId },
        data: { isActive: false },
      }),
      // Create audit log for the freeze action
      this.prisma.auditLog.create({
        data: {
          userId,
          action: 'user.data_frozen',
          entityType: 'User',
          entityId: userId,
          metadata: {
            frozenAt: new Date().toISOString(),
            reason: 'KVKK/GDPR data processing restriction request',
            previousState: { isActive: user.isActive },
          },
        },
      }),
    ]);

    return {
      message: `Data processing for user ${userId} has been frozen`,
      frozenAt: new Date().toISOString(),
    };
  }

  /**
   * Delete/anonymize user data (KVKK Article 7 / GDPR Article 17 - Right to Erasure)
   *
   * Anonymizes all PII:
   * - email -> anonymous_xxx@deleted.com
   * - name -> "Silindi"
   * - phone -> null
   *
   * Keeps transaction records for legal compliance (just anonymized)
   * Deletes: profile photo, KYC docs, favorites, notification preferences
   */
  async deleteUserData(userId: string) {
    this.logger.log(`Processing data deletion request for user: ${userId}`);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const anonymousId = `anonymous_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    await this.prisma.$transaction([
      // 1. Anonymize user record - keep the row for referential integrity
      this.prisma.user.update({
        where: { id: userId },
        data: {
          email: `${anonymousId}@deleted.com`,
          phone: null,
          isActive: false,
          isVerified: false,
          avatarUrl: null,
          twoFactorEnabled: false,
          twoFactorSecret: null,
          // Keep role, trustScore, kycStatus for historical analytics
        },
      }),

      // 2. Anonymize user profile
      ...(user.profile
        ? [
            this.prisma.userProfile.update({
              where: { userId },
              data: {
                firstName: 'Silindi',
                lastName: 'Silindi',
                displayName: null,
                bio: null,
                address: null,
                city: null,
                country: null,
                postalCode: null,
                interests: [],
                dateOfBirth: null,
              },
            }),
          ]
        : []),

      // 3. Delete KYC documents (PII documents)
      this.prisma.kycDocument.deleteMany({ where: { userId } }),

      // 4. Delete favorites
      this.prisma.favorite.deleteMany({ where: { userId } }),

      // 5. Delete notification preferences
      this.prisma.notificationPreference.deleteMany({ where: { userId } }),

      // 6. Delete notifications (PII in notification content)
      this.prisma.notification.deleteMany({ where: { userId } }),

      // 7. Delete auction follows
      this.prisma.auctionFollow.deleteMany({ where: { userId } }),

      // 8. Create audit log for the deletion
      this.prisma.auditLog.create({
        data: {
          userId: null, // anonymized, do not reference user anymore
          action: 'user.data_deleted',
          entityType: 'User',
          entityId: userId,
          metadata: {
            deletedAt: new Date().toISOString(),
            reason: 'KVKK/GDPR right to erasure request',
            anonymizedEmail: `${anonymousId}@deleted.com`,
            // Note: transaction records (orders, bids) are preserved but anonymized
            // for legal compliance (Turkish Commercial Code retention requirements)
          },
        },
      }),
    ]);

    return {
      message: `User data for ${userId} has been anonymized and non-essential data deleted`,
      deletedAt: new Date().toISOString(),
      retainedForLegalCompliance: [
        'Order records (anonymized)',
        'Bid records (anonymized)',
        'Transaction history (anonymized)',
      ],
    };
  }
}
