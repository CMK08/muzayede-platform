import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StreamingService {
  private readonly logger = new Logger(StreamingService.name);
  private readonly rtmpBaseUrl: string;
  private readonly playbackBaseUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.rtmpBaseUrl = this.configService.get<string>(
      'RTMP_BASE_URL',
      'rtmp://live.muzayede.com/live',
    );
    this.playbackBaseUrl = this.configService.get<string>(
      'PLAYBACK_BASE_URL',
      'https://live.muzayede.com/hls',
    );
  }

  /**
   * Create a new live streaming session for an auction.
   * 1. Validate auction exists and is LIVE
   * 2. Generate unique streamKey
   * 3. Create LiveSession record with rtmpUrl, playbackUrl
   * 4. Update Auction.isLiveStreaming = true
   */
  async createSession(auctionId: string) {
    this.logger.log(`Creating live session for auction: ${auctionId}`);

    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
    });

    if (!auction) {
      throw new NotFoundException(`Auction ${auctionId} not found`);
    }

    if (auction.status !== 'LIVE') {
      throw new BadRequestException(
        `Auction must be in LIVE status to create a streaming session. Current: ${auction.status}`,
      );
    }

    const existingSession = await this.prisma.liveSession.findUnique({
      where: { auctionId },
    });

    if (existingSession && existingSession.status !== 'ended') {
      throw new BadRequestException(
        `An active live session already exists for this auction`,
      );
    }

    if (existingSession && existingSession.status === 'ended') {
      await this.prisma.liveSession.delete({
        where: { id: existingSession.id },
      });
    }

    const streamKey = uuidv4();
    const rtmpUrl = `${this.rtmpBaseUrl}/${streamKey}`;
    const playbackUrl = `${this.playbackBaseUrl}/${streamKey}/index.m3u8`;

    const session = await this.prisma.liveSession.create({
      data: {
        auctionId,
        streamKey,
        rtmpUrl,
        playbackUrl,
        status: 'idle',
        viewerCount: 0,
      },
    });

    await this.prisma.auction.update({
      where: { id: auctionId },
      data: { isLiveStreaming: true },
    });

    this.logger.log(`Live session created: ${session.id}, streamKey=${streamKey}`);

    return {
      id: session.id,
      auctionId: session.auctionId,
      streamKey: session.streamKey,
      rtmpUrl: session.rtmpUrl,
      playbackUrl: session.playbackUrl,
      status: session.status,
      rtmpIngestUrl: rtmpUrl,
    };
  }

  /**
   * Start streaming: update LiveSession status to 'live', set startedAt.
   * Broadcasts session.started event.
   */
  async startStream(sessionId: string) {
    this.logger.log(`Starting stream: ${sessionId}`);

    const session = await this.prisma.liveSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException(`Live session ${sessionId} not found`);
    }

    if (session.status === 'live') {
      throw new BadRequestException('Stream is already live');
    }

    const updatedSession = await this.prisma.liveSession.update({
      where: { id: sessionId },
      data: {
        status: 'live',
        startedAt: new Date(),
      },
    });

    this.logger.log(`Stream started: ${sessionId}`);

    return {
      id: updatedSession.id,
      auctionId: updatedSession.auctionId,
      status: updatedSession.status,
      startedAt: updatedSession.startedAt,
      playbackUrl: updatedSession.playbackUrl,
    };
  }

  /**
   * End streaming: update status to 'ended', set endedAt.
   * Update Auction.isLiveStreaming = false.
   * Save recording URL if configured.
   */
  async endStream(sessionId: string) {
    this.logger.log(`Ending stream: ${sessionId}`);

    const session = await this.prisma.liveSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException(`Live session ${sessionId} not found`);
    }

    if (session.status === 'ended') {
      throw new BadRequestException('Stream is already ended');
    }

    const recordingUrl = this.configService.get<string>('RECORDING_ENABLED')
      ? `${this.playbackBaseUrl}/recordings/${session.streamKey}.mp4`
      : null;

    const updatedSession = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.liveSession.update({
        where: { id: sessionId },
        data: {
          status: 'ended',
          endedAt: new Date(),
          recordingUrl,
        },
      });

      await tx.auction.update({
        where: { id: session.auctionId },
        data: { isLiveStreaming: false },
      });

      return updated;
    });

    this.logger.log(`Stream ended: ${sessionId}`);

    return {
      id: updatedSession.id,
      auctionId: updatedSession.auctionId,
      status: updatedSession.status,
      startedAt: updatedSession.startedAt,
      endedAt: updatedSession.endedAt,
      recordingUrl: updatedSession.recordingUrl,
    };
  }

  /**
   * Get live session for an auction with auction relation.
   */
  async getSession(auctionId: string) {
    const session = await this.prisma.liveSession.findUnique({
      where: { auctionId },
    });

    if (!session) {
      throw new NotFoundException(
        `Live session not found for auction ${auctionId}`,
      );
    }

    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
      include: {
        lots: {
          orderBy: { lotNumber: 'asc' },
          include: { product: true },
        },
      },
    });

    return {
      ...session,
      auction,
    };
  }

  /**
   * Update viewer count for a live session.
   */
  async updateViewerCount(sessionId: string, count: number) {
    const session = await this.prisma.liveSession.update({
      where: { id: sessionId },
      data: { viewerCount: count },
    });

    return {
      id: session.id,
      viewerCount: session.viewerCount,
    };
  }
}
