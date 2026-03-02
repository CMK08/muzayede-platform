import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CommissionService } from '../commission/commission.service';

// ----------------------------------------------------------------
// Interfaces
// ----------------------------------------------------------------

export interface PayoutCalculation {
  orderId: string;
  grossAmount: number;
  buyerCommission: number;
  sellerCommission: number;
  netAmount: number;
  currency: string;
}

export interface PayoutRecord {
  id: string;
  orderId: string;
  sellerId: string;
  grossAmount: number;
  commissionAmount: number;
  netAmount: number;
  currency: string;
  status: string;
  scheduledDate: Date | null;
  paidAt: Date | null;
  bankRef: string | null;
  createdAt: Date;
}

// ----------------------------------------------------------------
// Service
// ----------------------------------------------------------------

@Injectable()
export class PayoutService {
  private readonly logger = new Logger(PayoutService.name);
  private readonly PAYOUT_DELAY_DAYS = 3;

  constructor(
    private readonly prisma: PrismaService,
    private readonly commissionService: CommissionService,
  ) {}

  /**
   * Calculate the payout for a seller after commission deduction.
   */
  async calculatePayout(orderId: string): Promise<PayoutCalculation> {
    this.logger.log(`Calculating payout for order: ${orderId}`);

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    const grossAmount = Number(order.hammerPrice);
    const buyerCommission = Number(order.buyerCommission);
    const sellerCommission = Number(order.sellerCommission);
    const netAmount = grossAmount - sellerCommission;

    return {
      orderId,
      grossAmount,
      buyerCommission,
      sellerCommission,
      netAmount,
      currency: order.currency,
    };
  }

  /**
   * Create a payout request for a seller.
   */
  async requestPayout(
    sellerId: string,
    amount: number,
  ): Promise<PayoutRecord> {
    this.logger.log(
      `Payout request: sellerId=${sellerId}, amount=${amount}`,
    );

    const sellerProfile = await this.prisma.sellerProfile.findFirst({
      where: { userId: sellerId },
    });

    if (!sellerProfile) {
      throw new NotFoundException(
        `Seller profile not found for user ${sellerId}`,
      );
    }

    // Find completed orders without payouts for this seller
    const eligibleOrders = await this.prisma.order.findMany({
      where: {
        sellerId,
        status: { in: ['COMPLETED', 'DELIVERED', 'PAID'] },
        payout: null,
      },
      orderBy: { createdAt: 'asc' },
    });

    if (eligibleOrders.length === 0) {
      throw new BadRequestException(
        'No eligible orders found for payout',
      );
    }

    // Use the first eligible order for the payout
    const order = eligibleOrders[0];
    const grossAmount = Number(order.hammerPrice);
    const commissionAmount = Number(order.sellerCommission);
    const netAmount = grossAmount - commissionAmount;

    if (amount > netAmount) {
      throw new BadRequestException(
        `Requested amount ${amount} exceeds available payout ${netAmount}`,
      );
    }

    const scheduledDate = new Date();
    scheduledDate.setDate(scheduledDate.getDate() + this.PAYOUT_DELAY_DAYS);

    const payout = await this.prisma.sellerPayout.create({
      data: {
        orderId: order.id,
        sellerId: sellerProfile.id,
        grossAmount,
        commissionAmount,
        netAmount: amount > 0 ? amount : netAmount,
        currency: order.currency,
        status: 'PENDING',
        scheduledDate,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: sellerId,
        action: 'payout.requested',
        entityType: 'SellerPayout',
        entityId: payout.id,
        metadata: {
          orderId: order.id,
          grossAmount,
          commissionAmount,
          netAmount: amount > 0 ? amount : netAmount,
          scheduledDate: scheduledDate.toISOString(),
        },
      },
    });

    this.logger.log(
      `Payout created: id=${payout.id}, netAmount=${payout.netAmount}, scheduledDate=${scheduledDate.toISOString()}`,
    );

    return this.toPayoutRecord(payout);
  }

  /**
   * Admin approves a payout - transitions from PENDING to PROCESSING.
   */
  async approvePayout(payoutId: string): Promise<PayoutRecord> {
    this.logger.log(`Approving payout: ${payoutId}`);

    const payout = await this.prisma.sellerPayout.findUnique({
      where: { id: payoutId },
      include: { seller: true },
    });

    if (!payout) {
      throw new NotFoundException(`Payout ${payoutId} not found`);
    }

    if (payout.status !== 'PENDING') {
      throw new BadRequestException(
        `Cannot approve payout in '${payout.status}' status`,
      );
    }

    const bankRef = `PAYOUT-${Date.now().toString(36).toUpperCase()}`;

    const updated = await this.prisma.sellerPayout.update({
      where: { id: payoutId },
      data: {
        status: 'PROCESSING',
        bankRef,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'payout.approved',
        entityType: 'SellerPayout',
        entityId: payoutId,
        metadata: {
          sellerId: payout.sellerId,
          orderId: payout.orderId,
          netAmount: Number(payout.netAmount),
          bankRef,
        },
      },
    });

    this.logger.log(`Payout approved: ${payoutId}, bankRef=${bankRef}`);

    return this.toPayoutRecord(updated);
  }

  /**
   * Get payout history for a seller (paginated).
   */
  async getPayoutHistory(
    sellerId: string,
    page = 1,
    limit = 20,
  ): Promise<{
    data: PayoutRecord[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    this.logger.log(`Getting payout history for seller: ${sellerId}`);

    const sellerProfile = await this.prisma.sellerProfile.findFirst({
      where: { userId: sellerId },
    });

    if (!sellerProfile) {
      throw new NotFoundException(
        `Seller profile not found for user ${sellerId}`,
      );
    }

    const skip = (page - 1) * limit;

    const [payouts, total] = await Promise.all([
      this.prisma.sellerPayout.findMany({
        where: { sellerId: sellerProfile.id },
        include: {
          order: {
            include: {
              auction: true,
              buyer: { include: { profile: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.sellerPayout.count({
        where: { sellerId: sellerProfile.id },
      }),
    ]);

    return {
      data: payouts.map((p) => this.toPayoutRecord(p)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ----------------------------------------------------------------
  // Private helpers
  // ----------------------------------------------------------------

  private toPayoutRecord(payout: any): PayoutRecord {
    return {
      id: payout.id,
      orderId: payout.orderId,
      sellerId: payout.sellerId,
      grossAmount: Number(payout.grossAmount),
      commissionAmount: Number(payout.commissionAmount),
      netAmount: Number(payout.netAmount),
      currency: payout.currency,
      status: payout.status,
      scheduledDate: payout.scheduledDate,
      paidAt: payout.paidAt,
      bankRef: payout.bankRef,
      createdAt: payout.createdAt,
    };
  }
}
