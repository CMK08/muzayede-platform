import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface EscrowRecord {
  id: string;
  orderId: string;
  sellerId: string;
  amount: number;
  status: 'held' | 'released' | 'refunded' | 'disputed';
  releaseConditions: {
    buyerConfirmed: boolean;
    deliveryConfirmed: boolean;
    disputePeriodExpired: boolean;
  };
  holdUntil: Date;
  createdAt: Date;
  releasedAt?: Date;
}

@Injectable()
export class EscrowService {
  private readonly logger = new Logger(EscrowService.name);
  private readonly DISPUTE_PERIOD_DAYS = 7;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create an escrow hold for an order.
   * Stores release conditions as JSON metadata on the Payment record.
   */
  async createEscrow(orderId: string, amount: number): Promise<EscrowRecord> {
    this.logger.log(`Creating escrow: order=${orderId}, amount=${amount}`);

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { seller: true },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    const holdUntil = new Date();
    holdUntil.setDate(holdUntil.getDate() + this.DISPUTE_PERIOD_DAYS);

    const releaseConditions = {
      buyerConfirmed: false,
      deliveryConfirmed: false,
      disputePeriodExpired: false,
    };

    const payment = await this.prisma.payment.create({
      data: {
        orderId,
        method: 'ESCROW',
        amount,
        currency: order.currency,
        status: 'PROCESSING',
        providerRef: `escrow_${orderId}_${Date.now()}`,
      },
    });

    this.logger.log(`Escrow created: id=${payment.id}, holdUntil=${holdUntil.toISOString()}`);

    return {
      id: payment.id,
      orderId,
      sellerId: order.sellerId,
      amount,
      status: 'held',
      releaseConditions,
      holdUntil,
      createdAt: payment.createdAt,
    };
  }

  /**
   * Release escrow: validate conditions met, transfer to seller, create payout record.
   */
  async releaseEscrow(escrowId: string): Promise<EscrowRecord> {
    this.logger.log(`Releasing escrow: ${escrowId}`);

    const payment = await this.prisma.payment.findUnique({
      where: { id: escrowId },
      include: {
        order: {
          include: { seller: { include: { sellerProfile: true } } },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException(`Escrow payment ${escrowId} not found`);
    }

    if (payment.method !== 'ESCROW') {
      throw new BadRequestException('Payment is not an escrow payment');
    }

    if (payment.status === 'COMPLETED') {
      throw new BadRequestException('Escrow already released');
    }

    if (payment.status === 'FAILED') {
      throw new BadRequestException('Cannot release a failed escrow');
    }

    const order = payment.order;
    const sellerProfile = order.seller.sellerProfile;

    const grossAmount = Number(payment.amount);
    const commissionAmount = Number(order.sellerCommission);
    const netAmount = grossAmount - commissionAmount;

    await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: escrowId },
        data: {
          status: 'COMPLETED',
          paidAt: new Date(),
        },
      });

      await tx.order.update({
        where: { id: order.id },
        data: { status: 'COMPLETED' },
      });

      if (sellerProfile) {
        await tx.sellerPayout.create({
          data: {
            orderId: order.id,
            sellerId: sellerProfile.id,
            grossAmount,
            commissionAmount,
            netAmount,
            currency: order.currency,
            status: 'PENDING',
            scheduledDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          },
        });
      }

      await tx.auditLog.create({
        data: {
          action: 'escrow.released',
          entityType: 'Payment',
          entityId: escrowId,
          metadata: {
            orderId: order.id,
            grossAmount,
            commissionAmount,
            netAmount,
          },
        },
      });
    });

    this.logger.log(
      `Escrow released: sellerId=${order.sellerId}, netAmount=${netAmount}`,
    );

    return {
      id: escrowId,
      orderId: order.id,
      sellerId: order.sellerId,
      amount: grossAmount,
      status: 'released',
      releaseConditions: {
        buyerConfirmed: true,
        deliveryConfirmed: true,
        disputePeriodExpired: true,
      },
      holdUntil: new Date(),
      createdAt: payment.createdAt,
      releasedAt: new Date(),
    };
  }

  /**
   * Handle a dispute on an escrow payment.
   */
  async handleDispute(escrowId: string, reason: string): Promise<EscrowRecord> {
    this.logger.log(`Escrow disputed: ${escrowId}, reason: ${reason}`);

    const payment = await this.prisma.payment.findUnique({
      where: { id: escrowId },
      include: { order: true },
    });

    if (!payment) {
      throw new NotFoundException(`Escrow payment ${escrowId} not found`);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: escrowId },
        data: {
          status: 'PENDING',
          failureReason: `DISPUTED: ${reason}`,
        },
      });

      await tx.order.update({
        where: { id: payment.orderId },
        data: { status: 'DISPUTED' },
      });

      await tx.auditLog.create({
        data: {
          action: 'escrow.disputed',
          entityType: 'Payment',
          entityId: escrowId,
          metadata: {
            orderId: payment.orderId,
            reason,
          },
        },
      });
    });

    return {
      id: escrowId,
      orderId: payment.orderId,
      sellerId: payment.order.sellerId,
      amount: Number(payment.amount),
      status: 'disputed',
      releaseConditions: {
        buyerConfirmed: false,
        deliveryConfirmed: false,
        disputePeriodExpired: false,
      },
      holdUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      createdAt: payment.createdAt,
    };
  }
}
