import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StreamingService } from '../streaming/streaming.service';

@Injectable()
export class AuctioneerService {
  private readonly logger = new Logger(AuctioneerService.name);

  /** In-memory map of auction countdowns for going-once/going-twice */
  private readonly countdownTimers = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly streamingService: StreamingService,
  ) {}

  /**
   * Create an auctioneer session: validate auction, load lots, create live session.
   */
  async createSession(auctionId: string, auctioneerId?: string) {
    this.logger.log(`Creating auctioneer session: auction=${auctionId}`);

    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
      include: {
        lots: {
          orderBy: { lotNumber: 'asc' },
          include: { product: true },
        },
      },
    });

    if (!auction) {
      throw new NotFoundException(`Auction ${auctionId} not found`);
    }

    let liveSession: any;
    try {
      liveSession = await this.streamingService.createSession(auctionId);
    } catch {
      liveSession = await this.streamingService.getSession(auctionId);
    }

    return {
      id: liveSession.id,
      auctionId,
      auctioneerId: auctioneerId || auction.createdBy,
      sessionId: liveSession.id,
      streamKey: liveSession.streamKey,
      rtmpUrl: liveSession.rtmpUrl,
      playbackUrl: liveSession.playbackUrl,
      status: 'created',
      lots: auction.lots.map((lot) => ({
        id: lot.id,
        lotNumber: lot.lotNumber,
        productId: lot.productId,
        productTitle: lot.product.title,
        status: lot.status,
        estimateLow: lot.product.estimateLow
          ? Number(lot.product.estimateLow)
          : null,
        estimateHigh: lot.product.estimateHigh
          ? Number(lot.product.estimateHigh)
          : null,
      })),
      currentLotIndex: -1,
    };
  }

  /**
   * Start live auction session: start the stream.
   */
  async startSession(sessionId: string) {
    this.logger.log(`Starting auctioneer session: ${sessionId}`);

    const result = await this.streamingService.startStream(sessionId);

    return {
      sessionId,
      status: 'live',
      startedAt: result.startedAt,
      playbackUrl: result.playbackUrl,
    };
  }

  /**
   * Open a lot by auction ID and lot number.
   * Updates lot status to 'active' and broadcasts lot.opened event.
   */
  async openLot(auctionId: string, lotNumber: number) {
    this.logger.log(`Opening lot ${lotNumber} for auction ${auctionId}`);

    const lot = await this.prisma.auctionLot.findUnique({
      where: {
        auctionId_lotNumber: { auctionId, lotNumber },
      },
      include: {
        product: {
          include: { media: { where: { isPrimary: true }, take: 1 } },
        },
      },
    });

    if (!lot) {
      throw new NotFoundException(
        `Lot ${lotNumber} not found in auction ${auctionId}`,
      );
    }

    if (lot.status !== 'pending') {
      throw new BadRequestException(
        `Lot ${lotNumber} is already in '${lot.status}' status`,
      );
    }

    const updatedLot = await this.prisma.auctionLot.update({
      where: { id: lot.id },
      data: { status: 'active' },
      include: {
        product: {
          include: { media: true },
        },
      },
    });

    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
    });

    this.logger.log(`Lot ${lotNumber} opened for auction ${auctionId}`);

    return {
      event: 'lot.opened',
      auctionId,
      lot: {
        id: updatedLot.id,
        lotNumber: updatedLot.lotNumber,
        status: updatedLot.status,
        product: {
          id: updatedLot.product.id,
          title: updatedLot.product.title,
          description: updatedLot.product.shortDescription,
          condition: updatedLot.product.condition,
          estimateLow: updatedLot.product.estimateLow
            ? Number(updatedLot.product.estimateLow)
            : null,
          estimateHigh: updatedLot.product.estimateHigh
            ? Number(updatedLot.product.estimateHigh)
            : null,
          media: updatedLot.product.media.map((m) => ({
            url: m.url,
            type: m.type,
            thumbnailUrl: m.thumbnailUrl,
          })),
        },
        startPrice: auction ? Number(auction.startPrice) : 0,
        minIncrement: auction ? Number(auction.minIncrement) : 0,
      },
    };
  }

  /**
   * Going once warning: 15 second countdown.
   */
  async goingOnce(auctionId: string) {
    this.logger.log(`Going once: auction=${auctionId}`);

    return {
      event: 'going_once',
      auctionId,
      countdown: 15,
      message: 'Bir kere... (Going once)',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Going twice warning: 10 second countdown.
   */
  async goingTwice(auctionId: string) {
    this.logger.log(`Going twice: auction=${auctionId}`);

    return {
      event: 'going_twice',
      auctionId,
      countdown: 10,
      message: 'Iki kere... (Going twice)',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Sold: find winning bid, update lot, broadcast, auto-advance.
   */
  async sold(auctionId: string, lotNumber: number) {
    this.logger.log(`Sold: auction=${auctionId}, lot=${lotNumber}`);

    const lot = await this.prisma.auctionLot.findUnique({
      where: {
        auctionId_lotNumber: { auctionId, lotNumber },
      },
    });

    if (!lot) {
      throw new NotFoundException(
        `Lot ${lotNumber} not found in auction ${auctionId}`,
      );
    }

    const winningBid = await this.prisma.bid.findFirst({
      where: {
        auctionId,
        isWinning: true,
        isRetracted: false,
      },
      orderBy: { amount: 'desc' },
      include: {
        user: { include: { profile: true } },
      },
    });

    if (!winningBid) {
      return this.passLot(auctionId, lotNumber);
    }

    const updatedLot = await this.prisma.auctionLot.update({
      where: { id: lot.id },
      data: {
        status: 'sold',
        hammerPrice: winningBid.amount,
        winnerId: winningBid.userId,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: winningBid.userId,
        action: 'lot.sold',
        entityType: 'AuctionLot',
        entityId: lot.id,
        metadata: {
          auctionId,
          lotNumber,
          hammerPrice: Number(winningBid.amount),
          winnerId: winningBid.userId,
          bidId: winningBid.id,
        },
      },
    });

    const nextLotResult = await this.tryAdvanceToNextLot(auctionId, lotNumber);

    const winnerProfile = winningBid.user.profile;
    const winnerName = winnerProfile
      ? `${winnerProfile.firstName} ${winnerProfile.lastName.charAt(0)}.`
      : `Alici ${winningBid.userId.substring(0, 6)}`;

    return {
      event: 'lot.sold',
      auctionId,
      lot: {
        id: updatedLot.id,
        lotNumber: updatedLot.lotNumber,
        status: 'sold',
        hammerPrice: Number(winningBid.amount),
      },
      winner: {
        userId: winningBid.userId,
        displayName: winnerName,
        bidId: winningBid.id,
      },
      nextLot: nextLotResult,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Pass lot: no bids or reserve not met. Mark as unsold, auto-advance.
   */
  async passLot(auctionId: string, lotNumber: number) {
    this.logger.log(`Passing lot: auction=${auctionId}, lot=${lotNumber}`);

    const lot = await this.prisma.auctionLot.findUnique({
      where: {
        auctionId_lotNumber: { auctionId, lotNumber },
      },
    });

    if (!lot) {
      throw new NotFoundException(
        `Lot ${lotNumber} not found in auction ${auctionId}`,
      );
    }

    await this.prisma.auctionLot.update({
      where: { id: lot.id },
      data: { status: 'unsold' },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'lot.passed',
        entityType: 'AuctionLot',
        entityId: lot.id,
        metadata: {
          auctionId,
          lotNumber,
          reason: 'No bids or reserve not met',
        },
      },
    });

    const nextLotResult = await this.tryAdvanceToNextLot(auctionId, lotNumber);

    return {
      event: 'lot.passed',
      auctionId,
      lot: {
        id: lot.id,
        lotNumber,
        status: 'unsold',
      },
      nextLot: nextLotResult,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Accept a phone/absentee bid on behalf of a bidder.
   */
  async acceptPhoneBid(
    auctionId: string,
    amount: number,
    adminUserId: string,
  ) {
    this.logger.log(
      `Phone bid: auction=${auctionId}, amount=${amount}, admin=${adminUserId}`,
    );

    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
    });

    if (!auction) {
      throw new NotFoundException(`Auction ${auctionId} not found`);
    }

    // Mark previous winning bid as not winning
    await this.prisma.bid.updateMany({
      where: { auctionId, isWinning: true },
      data: { isWinning: false },
    });

    const bid = await this.prisma.bid.create({
      data: {
        auctionId,
        userId: adminUserId,
        amount,
        type: 'ABSENTEE',
        isWinning: true,
      },
    });

    await this.prisma.auction.update({
      where: { id: auctionId },
      data: {
        currentPrice: amount,
        bidCount: { increment: 1 },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: 'bid.phone_accepted',
        entityType: 'Bid',
        entityId: bid.id,
        metadata: {
          auctionId,
          amount,
          type: 'ABSENTEE',
          placedByAdmin: adminUserId,
        },
      },
    });

    this.logger.log(`Phone bid placed: bidId=${bid.id}, amount=${amount}`);

    return {
      event: 'new-bid',
      bidId: bid.id,
      auctionId,
      amount: Number(bid.amount),
      type: 'ABSENTEE',
      placedByAdmin: adminUserId,
      timestamp: bid.createdAt.toISOString(),
    };
  }

  /**
   * Accept a bid in a session (going once, twice, sold flow).
   */
  async acceptBid(sessionId: string, bidId: string) {
    this.logger.log(`Bid accepted in session ${sessionId}: ${bidId}`);

    const bid = await this.prisma.bid.findUnique({
      where: { id: bidId },
      include: { user: { include: { profile: true } } },
    });

    if (!bid) {
      throw new NotFoundException(`Bid ${bidId} not found`);
    }

    return {
      sessionId,
      bidId,
      accepted: true,
      amount: Number(bid.amount),
      userId: bid.userId,
    };
  }

  /**
   * Make an auctioneer call (going_once, going_twice, sold, no_sale).
   */
  async makeCall(
    sessionId: string,
    call: 'going_once' | 'going_twice' | 'sold' | 'no_sale',
  ) {
    this.logger.log(`Auctioneer call: ${call} (session: ${sessionId})`);

    const session = await this.prisma.liveSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    const callMessages: Record<string, string> = {
      going_once: 'Bir kere... (Going once)',
      going_twice: 'Iki kere... (Going twice)',
      sold: 'SATILDI! (Sold!)',
      no_sale: 'Satilmadi (No sale)',
    };

    const callCountdowns: Record<string, number> = {
      going_once: 15,
      going_twice: 10,
      sold: 0,
      no_sale: 0,
    };

    return {
      event: `auctioneer.${call}`,
      sessionId,
      auctionId: session.auctionId,
      call,
      message: callMessages[call],
      countdown: callCountdowns[call],
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * End live auction session.
   */
  async endSession(sessionId: string) {
    this.logger.log(`Ending auctioneer session: ${sessionId}`);

    const result = await this.streamingService.endStream(sessionId);

    return {
      sessionId,
      auctionId: result.auctionId,
      status: 'ended',
      endedAt: result.endedAt,
      recordingUrl: result.recordingUrl,
    };
  }

  /**
   * Get current session status.
   */
  async getSession(sessionId: string) {
    const session = await this.prisma.liveSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    const auction = await this.prisma.auction.findUnique({
      where: { id: session.auctionId },
      include: {
        lots: {
          orderBy: { lotNumber: 'asc' },
          include: { product: true },
        },
      },
    });

    const activeLot = auction?.lots.find((l) => l.status === 'active');

    return {
      id: session.id,
      auctionId: session.auctionId,
      status: session.status,
      viewerCount: session.viewerCount,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      playbackUrl: session.playbackUrl,
      currentLot: activeLot
        ? {
            id: activeLot.id,
            lotNumber: activeLot.lotNumber,
            productTitle: activeLot.product.title,
            status: activeLot.status,
          }
        : null,
      lots: auction?.lots.map((lot) => ({
        id: lot.id,
        lotNumber: lot.lotNumber,
        productTitle: lot.product.title,
        status: lot.status,
        hammerPrice: lot.hammerPrice ? Number(lot.hammerPrice) : null,
      })),
    };
  }

  /**
   * Move to next lot after one completes.
   */
  private async tryAdvanceToNextLot(
    auctionId: string,
    currentLotNumber: number,
  ): Promise<any> {
    const nextLot = await this.prisma.auctionLot.findFirst({
      where: {
        auctionId,
        lotNumber: { gt: currentLotNumber },
        status: 'pending',
      },
      orderBy: { lotNumber: 'asc' },
      include: { product: true },
    });

    if (nextLot) {
      return {
        id: nextLot.id,
        lotNumber: nextLot.lotNumber,
        productTitle: nextLot.product.title,
        status: nextLot.status,
      };
    }

    return null;
  }

  /**
   * Advance to next lot (called from controller nextLot).
   */
  async nextLot(sessionId: string) {
    const session = await this.prisma.liveSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    const activeLot = await this.prisma.auctionLot.findFirst({
      where: {
        auctionId: session.auctionId,
        status: 'active',
      },
    });

    const currentLotNumber = activeLot?.lotNumber || 0;

    const nextLot = await this.prisma.auctionLot.findFirst({
      where: {
        auctionId: session.auctionId,
        lotNumber: { gt: currentLotNumber },
        status: 'pending',
      },
      orderBy: { lotNumber: 'asc' },
      include: { product: true },
    });

    if (!nextLot) {
      return {
        event: 'auction.no_more_lots',
        auctionId: session.auctionId,
        message: 'Tum lotlar tamamlandi (All lots completed)',
      };
    }

    return this.openLot(session.auctionId, nextLot.lotNumber);
  }
}
