import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class AntiSnipeService {
  private readonly logger = new Logger(AntiSnipeService.name);
  private readonly maxExtensions: number;

  private extensionCounts = new Map<string, number>();

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.maxExtensions = this.configService.get<number>('ANTI_SNIPE_MAX_EXTENSIONS', 10);
  }

  /**
   * Check if a bid placed near the auction end should trigger a time extension.
   * If extended, persists the new actualEndDate in the database, logs it, and emits an event.
   *
   * @param auctionId     The auction ID to check.
   * @param endDate       The current end date (actualEndDate or endDate).
   * @param bidTime       The timestamp of the bid that might trigger extension.
   * @param thresholdMin  Anti-snipe threshold in minutes (from the auction record).
   * @param extensionMin  Anti-snipe extension duration in minutes (from the auction record).
   * @returns The new end date if extended, or null if no extension needed.
   */
  async checkAndExtend(
    auctionId: string,
    endDate: Date,
    bidTime: Date,
    thresholdMin: number,
    extensionMin: number,
  ): Promise<Date | null> {
    if (thresholdMin <= 0 || extensionMin <= 0) return null;

    const timeRemainingMs = endDate.getTime() - bidTime.getTime();
    const thresholdMs = thresholdMin * 60 * 1000;

    if (timeRemainingMs > thresholdMs || timeRemainingMs < 0) {
      return null;
    }

    // Check max extensions
    const currentExtensions = this.extensionCounts.get(auctionId) || 0;
    if (currentExtensions >= this.maxExtensions) {
      this.logger.warn(
        `Auction ${auctionId} has reached maximum extensions (${this.maxExtensions})`,
      );
      return null;
    }

    const extensionMs = extensionMin * 60 * 1000;
    const newEndDate = new Date(endDate.getTime() + extensionMs);

    // Persist the extension in the database
    await this.prisma.auction.update({
      where: { id: auctionId },
      data: { actualEndDate: newEndDate },
    });

    // Log the extension in AuditLog
    await this.prisma.auditLog.create({
      data: {
        action: 'auction.anti_snipe_extended',
        entityType: 'Auction',
        entityId: auctionId,
        metadata: {
          previousEndDate: endDate.toISOString(),
          newEndDate: newEndDate.toISOString(),
          extensionNumber: currentExtensions + 1,
          thresholdMinutes: thresholdMin,
          extensionMinutes: extensionMin,
        },
      },
    });

    this.extensionCounts.set(auctionId, currentExtensions + 1);

    this.logger.log(
      `Anti-snipe triggered for auction ${auctionId}: extended from ${endDate.toISOString()} to ${newEndDate.toISOString()} (extension #${currentExtensions + 1})`,
    );

    // Emit event for WebSocket broadcast
    this.eventEmitter.emit('auction.extended', {
      auctionId,
      previousEndDate: endDate,
      newEndDate,
      extensionNumber: currentExtensions + 1,
    });

    return newEndDate;
  }

  resetExtensionCount(auctionId: string): void {
    this.extensionCounts.delete(auctionId);
  }

  getExtensionCount(auctionId: string): number {
    return this.extensionCounts.get(auctionId) || 0;
  }
}
