import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuctionService } from '../auction/auction.service';

@Injectable()
export class AuctionSchedulerService {
  private readonly logger = new Logger(AuctionSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auctionService: AuctionService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ---------------------------------------------------------------------------
  // AUTO-START: Every 30 seconds, transition PUBLISHED auctions to LIVE
  // ---------------------------------------------------------------------------

  @Cron('*/30 * * * * *')
  async handleScheduledAuctionStart(): Promise<void> {
    this.logger.debug('Checking for auctions to start...');

    try {
      const now = new Date();

      const auctionsToStart = await this.prisma.auction.findMany({
        where: {
          status: 'PUBLISHED',
          startDate: { lte: now },
        },
        select: { id: true, title: true, type: true },
      });

      if (auctionsToStart.length === 0) return;

      this.logger.log(`Found ${auctionsToStart.length} auctions to start`);

      for (const auction of auctionsToStart) {
        try {
          await this.auctionService.start(auction.id);
          this.logger.log(`Auction ${auction.id} ("${auction.title}") auto-started`);
        } catch (error: any) {
          this.logger.error(
            `Failed to auto-start auction ${auction.id}: ${error.message}`,
          );
        }
      }
    } catch (error: any) {
      this.logger.error(`Scheduler handleScheduledAuctionStart failed: ${error.message}`);
    }
  }

  // ---------------------------------------------------------------------------
  // AUTO-END: Every 10 seconds, end LIVE auctions past their endDate
  // ---------------------------------------------------------------------------

  @Cron('*/10 * * * * *')
  async handleAuctionEnd(): Promise<void> {
    this.logger.debug('Checking for auctions to end...');

    try {
      const now = new Date();

      // An auction should end if its effective end date (actualEndDate or endDate) has passed
      const auctionsToEnd = await this.prisma.auction.findMany({
        where: {
          status: 'LIVE',
          OR: [
            { actualEndDate: { not: null, lte: now } },
            { actualEndDate: null, endDate: { lte: now } },
          ],
        },
        select: { id: true, title: true, type: true },
      });

      if (auctionsToEnd.length === 0) return;

      this.logger.log(`Found ${auctionsToEnd.length} auctions to end`);

      for (const auction of auctionsToEnd) {
        try {
          await this.auctionService.end(auction.id);
          this.logger.log(`Auction ${auction.id} ("${auction.title}") auto-ended`);
        } catch (error: any) {
          this.logger.error(
            `Failed to auto-end auction ${auction.id}: ${error.message}`,
          );
        }
      }
    } catch (error: any) {
      this.logger.error(`Scheduler handleAuctionEnd failed: ${error.message}`);
    }
  }

  // ---------------------------------------------------------------------------
  // DUTCH PRICE REDUCTION: Every 5 seconds, reduce price for Dutch auctions
  // ---------------------------------------------------------------------------

  @Cron('*/5 * * * * *')
  async handleDutchPriceReduction(): Promise<void> {
    this.logger.debug('Checking for Dutch auction price reductions...');

    try {
      const dutchAuctions = await this.prisma.auction.findMany({
        where: {
          status: 'LIVE',
          type: 'DUTCH',
          dutchDecrement: { not: null },
          dutchDecrementInterval: { not: null },
        },
        select: {
          id: true,
          title: true,
          currentPrice: true,
          startPrice: true,
          dutchStartPrice: true,
          dutchDecrement: true,
          dutchDecrementInterval: true,
          updatedAt: true,
        },
      });

      if (dutchAuctions.length === 0) return;

      const now = new Date();

      for (const auction of dutchAuctions) {
        try {
          const intervalMs = (auction.dutchDecrementInterval ?? 60) * 1000;
          const timeSinceLastUpdate = now.getTime() - auction.updatedAt.getTime();

          // Check if enough time has passed for a price reduction
          if (timeSinceLastUpdate < intervalMs) continue;

          const currentPrice = Number(auction.currentPrice);
          const decrement = Number(auction.dutchDecrement);
          const floorPrice = Number(auction.startPrice); // startPrice is the floor in Dutch

          const newPrice = currentPrice - decrement;

          if (newPrice <= floorPrice) {
            // Floor reached: end auction as unsold
            this.logger.log(
              `Dutch auction ${auction.id} hit floor price. Ending as unsold.`,
            );
            await this.auctionService.end(auction.id);
            continue;
          }

          // Reduce the price
          await this.prisma.auction.update({
            where: { id: auction.id },
            data: {
              currentPrice: new Prisma.Decimal(newPrice),
            },
          });

          this.logger.debug(
            `Dutch auction ${auction.id}: price reduced from ${currentPrice} to ${newPrice}`,
          );

          // Broadcast new price
          this.eventEmitter.emit('auction.price_updated', {
            auctionId: auction.id,
            previousPrice: currentPrice,
            newPrice,
            type: 'DUTCH',
          });
        } catch (error: any) {
          this.logger.error(
            `Failed to reduce price for Dutch auction ${auction.id}: ${error.message}`,
          );
        }
      }
    } catch (error: any) {
      this.logger.error(`Scheduler handleDutchPriceReduction failed: ${error.message}`);
    }
  }

  // ---------------------------------------------------------------------------
  // ENDING-SOON REMINDERS: Every 5 minutes, notify followers of soon-ending auctions
  // ---------------------------------------------------------------------------

  @Cron('0 */5 * * * *')
  async handleEndingSoonReminders(): Promise<void> {
    this.logger.debug('Checking for ending-soon reminders...');

    try {
      const now = new Date();
      const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000);

      const endingSoon = await this.prisma.auction.findMany({
        where: {
          status: 'LIVE',
          endDate: {
            gte: now,
            lte: thirtyMinutesFromNow,
          },
        },
        include: {
          follows: { select: { userId: true } },
        },
      });

      if (endingSoon.length === 0) return;

      this.logger.log(`Found ${endingSoon.length} auctions ending soon`);

      for (const auction of endingSoon) {
        const followerIds = auction.follows.map((f) => f.userId);
        if (followerIds.length === 0) continue;

        this.eventEmitter.emit('auction.ending_soon', {
          auctionId: auction.id,
          title: auction.title,
          endDate: auction.endDate,
          currentPrice: Number(auction.currentPrice),
          notifyUserIds: followerIds,
        });

        this.logger.debug(
          `Ending-soon notification emitted for auction ${auction.id} to ${followerIds.length} followers`,
        );
      }
    } catch (error: any) {
      this.logger.error(`Scheduler handleEndingSoonReminders failed: ${error.message}`);
    }
  }

  // ---------------------------------------------------------------------------
  // ARCHIVING: Daily at midnight, archive old completed/cancelled auctions
  // ---------------------------------------------------------------------------

  @Cron('0 0 0 * * *')
  async handleArchiving(): Promise<void> {
    this.logger.log('Running daily auction archiving...');

    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const result = await this.prisma.auction.updateMany({
        where: {
          status: { in: ['COMPLETED', 'CANCELLED'] },
          updatedAt: { lte: thirtyDaysAgo },
        },
        data: {
          status: 'ARCHIVED',
        },
      });

      if (result.count > 0) {
        this.logger.log(`Archived ${result.count} auctions older than 30 days`);
      }
    } catch (error: any) {
      this.logger.error(`Scheduler handleArchiving failed: ${error.message}`);
    }
  }
}
