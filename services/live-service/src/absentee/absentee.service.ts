import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AbsenteeService {
  private readonly logger = new Logger(AbsenteeService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Place an absentee bid for a lot in an auction.
   * The system will auto-bid up to maxAmount when the lot opens.
   */
  async placeAbsenteeBid(
    auctionId: string,
    lotId: string,
    userId: string,
    maxAmount: number,
  ) {
    this.logger.log(
      `Absentee bid: auction=${auctionId}, lot=${lotId}, user=${userId}, max=${maxAmount}`,
    );

    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
    });

    if (!auction) {
      throw new NotFoundException(`Auction ${auctionId} not found`);
    }

    if (
      auction.status !== 'PUBLISHED' &&
      auction.status !== 'PRE_BID' &&
      auction.status !== 'LIVE'
    ) {
      throw new BadRequestException(
        `Cannot place absentee bids on an auction in '${auction.status}' status`,
      );
    }

    if (maxAmount <= 0) {
      throw new BadRequestException('Max amount must be greater than zero');
    }

    const startPrice = Number(auction.startPrice);
    if (maxAmount < startPrice) {
      throw new BadRequestException(
        `Max amount (${maxAmount}) must be at least the start price (${startPrice})`,
      );
    }

    const existing = await this.prisma.absenteeBid.findUnique({
      where: {
        auctionId_lotId_userId: { auctionId, lotId, userId },
      },
    });

    if (existing && existing.isActive) {
      const updatedBid = await this.prisma.absenteeBid.update({
        where: { id: existing.id },
        data: { maxAmount },
      });

      this.logger.log(
        `Absentee bid updated: ${updatedBid.id}, newMax=${maxAmount}`,
      );

      return {
        id: updatedBid.id,
        auctionId: updatedBid.auctionId,
        lotId: updatedBid.lotId,
        userId: updatedBid.userId,
        maxAmount: Number(updatedBid.maxAmount),
        isActive: updatedBid.isActive,
        updated: true,
        createdAt: updatedBid.createdAt,
      };
    }

    const absenteeBid = await this.prisma.absenteeBid.create({
      data: {
        auctionId,
        lotId,
        userId,
        maxAmount,
        isActive: true,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'absentee_bid.placed',
        entityType: 'AbsenteeBid',
        entityId: absenteeBid.id,
        metadata: {
          auctionId,
          lotId,
          maxAmount,
        },
      },
    });

    this.logger.log(`Absentee bid created: ${absenteeBid.id}`);

    return {
      id: absenteeBid.id,
      auctionId: absenteeBid.auctionId,
      lotId: absenteeBid.lotId,
      userId: absenteeBid.userId,
      maxAmount: Number(absenteeBid.maxAmount),
      isActive: absenteeBid.isActive,
      updated: false,
      createdAt: absenteeBid.createdAt,
    };
  }

  /**
   * Get all absentee bids for an auction (admin view).
   */
  async getAbsenteeBids(auctionId: string) {
    const bids = await this.prisma.absenteeBid.findMany({
      where: { auctionId },
      orderBy: [{ lotId: 'asc' }, { maxAmount: 'desc' }],
    });

    const userIds = [...new Set(bids.map((b) => b.userId))];
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      include: { profile: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    return bids.map((bid) => {
      const user = userMap.get(bid.userId);
      return {
        id: bid.id,
        auctionId: bid.auctionId,
        lotId: bid.lotId,
        userId: bid.userId,
        userName: user?.profile
          ? `${user.profile.firstName} ${user.profile.lastName}`
          : user?.email || 'Unknown',
        maxAmount: Number(bid.maxAmount),
        isActive: bid.isActive,
        createdAt: bid.createdAt,
      };
    });
  }

  /**
   * Get absentee bids for a specific lot (used during live auction).
   */
  async getAbsenteeBidsForLot(auctionId: string, lotId: string) {
    const bids = await this.prisma.absenteeBid.findMany({
      where: {
        auctionId,
        lotId,
        isActive: true,
      },
      orderBy: { maxAmount: 'desc' },
    });

    return bids.map((bid) => ({
      id: bid.id,
      userId: bid.userId,
      maxAmount: Number(bid.maxAmount),
      isActive: bid.isActive,
    }));
  }

  /**
   * Cancel an absentee bid.
   */
  async cancelAbsenteeBid(id: string, userId: string) {
    this.logger.log(`Cancelling absentee bid: ${id}, userId=${userId}`);

    const bid = await this.prisma.absenteeBid.findUnique({
      where: { id },
    });

    if (!bid) {
      throw new NotFoundException(`Absentee bid ${id} not found`);
    }

    if (bid.userId !== userId) {
      throw new BadRequestException(
        'You can only cancel your own absentee bids',
      );
    }

    if (!bid.isActive) {
      throw new BadRequestException('This absentee bid is already inactive');
    }

    const updatedBid = await this.prisma.absenteeBid.update({
      where: { id },
      data: { isActive: false },
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'absentee_bid.cancelled',
        entityType: 'AbsenteeBid',
        entityId: id,
        metadata: {
          auctionId: bid.auctionId,
          lotId: bid.lotId,
          maxAmount: Number(bid.maxAmount),
        },
      },
    });

    this.logger.log(`Absentee bid cancelled: ${id}`);

    return {
      id: updatedBid.id,
      isActive: false,
      message: 'Devamsiz teklif iptal edildi',
    };
  }

  /**
   * Execute absentee bids when a lot opens.
   * Called by the auctioneer service when opening a new lot.
   * Returns the highest absentee bid that should be placed as the initial bid.
   */
  async executeAbsenteeBidsForLot(auctionId: string, lotId: string) {
    const activeBids = await this.prisma.absenteeBid.findMany({
      where: {
        auctionId,
        lotId,
        isActive: true,
      },
      orderBy: { maxAmount: 'desc' },
    });

    if (activeBids.length === 0) {
      return null;
    }

    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
    });

    if (!auction) return null;

    const startPrice = Number(auction.startPrice);
    const minIncrement = Number(auction.minIncrement);

    if (activeBids.length === 1) {
      const bid = activeBids[0];
      if (Number(bid.maxAmount) >= startPrice) {
        return {
          userId: bid.userId,
          amount: startPrice,
          absenteeBidId: bid.id,
          maxAmount: Number(bid.maxAmount),
        };
      }
      return null;
    }

    const highest = activeBids[0];
    const secondHighest = activeBids[1];

    let executionAmount = Number(secondHighest.maxAmount) + minIncrement;
    executionAmount = Math.min(executionAmount, Number(highest.maxAmount));
    executionAmount = Math.max(executionAmount, startPrice);

    return {
      userId: highest.userId,
      amount: executionAmount,
      absenteeBidId: highest.id,
      maxAmount: Number(highest.maxAmount),
      competingBidId: secondHighest.id,
    };
  }
}
