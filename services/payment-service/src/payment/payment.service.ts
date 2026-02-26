import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IyzicoService } from '../iyzico/iyzico.service';
import { EscrowService } from '../escrow/escrow.service';
import { CommissionService } from '../commission/commission.service';
import { InvoiceService } from '../invoice/invoice.service';

interface InitiatePaymentDto {
  auctionId: string;
  bidId: string;
  buyerId: string;
  method: 'CREDIT_CARD' | 'BANK_TRANSFER' | 'ESCROW';
  ip?: string;
}

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly iyzicoService: IyzicoService,
    private readonly escrowService: EscrowService,
    private readonly commissionService: CommissionService,
    private readonly invoiceService: InvoiceService,
  ) {}

  /**
   * Initiate a payment for an auction win.
   * 1. Find Order by auctionId/bidId
   * 2. Calculate commission via CommissionService
   * 3. Create Payment record (status: PENDING, method from dto)
   * 4. For CREDIT_CARD: call IyzicoService.createPaymentForm()
   * 5. For BANK_TRANSFER: generate reference code, return bank details
   * 6. For ESCROW: create escrow record via EscrowService
   * 7. Create AuditLog entry
   */
  async initiatePayment(dto: InitiatePaymentDto) {
    this.logger.log(
      `Initiating payment: auction=${dto.auctionId}, bid=${dto.bidId}, method=${dto.method}`,
    );

    const order = await this.prisma.order.findFirst({
      where: {
        auctionId: dto.auctionId,
        bidId: dto.bidId,
      },
      include: {
        buyer: { include: { profile: true } },
        seller: { include: { sellerProfile: true } },
        auction: true,
      },
    });

    if (!order) {
      throw new NotFoundException(
        `Order not found for auctionId=${dto.auctionId}, bidId=${dto.bidId}`,
      );
    }

    const commission = await this.commissionService.calculate(
      order.sellerId,
      Number(order.hammerPrice),
    );

    const totalAmount =
      Number(order.hammerPrice) +
      commission.buyerCommission +
      Number(order.vatAmount);

    const payment = await this.prisma.payment.create({
      data: {
        orderId: order.id,
        method: dto.method,
        amount: totalAmount,
        currency: order.currency,
        status: 'PENDING',
        installments: 1,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: dto.buyerId,
        action: 'payment.initiated',
        entityType: 'Payment',
        entityId: payment.id,
        ipAddress: dto.ip || null,
        metadata: {
          orderId: order.id,
          method: dto.method,
          amount: totalAmount,
          hammerPrice: Number(order.hammerPrice),
          buyerCommission: commission.buyerCommission,
          sellerCommission: commission.sellerCommission,
        },
      },
    });

    let redirectUrl: string | null = null;
    let bankDetails: any = null;
    let escrowRecord: any = null;

    if (dto.method === 'CREDIT_CARD') {
      const buyerProfile = order.buyer.profile;
      const iyzicoResult = await this.iyzicoService.createPaymentForm(
        {
          id: payment.id,
          amount: totalAmount,
          currency: order.currency,
        },
        {
          id: order.id,
          orderNumber: order.orderNumber,
          hammerPrice: Number(order.hammerPrice),
          buyerCommission: commission.buyerCommission,
          auctionId: order.auctionId,
        },
        {
          id: order.buyerId,
          email: order.buyer.email,
          firstName: buyerProfile?.firstName || 'Alici',
          lastName: buyerProfile?.lastName || 'Kullanici',
          phone: order.buyer.phone || '',
          address: buyerProfile?.address || '',
          city: buyerProfile?.city || '',
          country: buyerProfile?.country || 'Turkey',
          ip: dto.ip || '85.34.78.112',
        },
      );

      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          providerRef: iyzicoResult.token,
          status: 'PROCESSING',
        },
      });

      redirectUrl = iyzicoResult.paymentPageUrl;
    } else if (dto.method === 'BANK_TRANSFER') {
      const referenceCode = `MZY-${order.orderNumber}-${Date.now().toString(36).toUpperCase()}`;
      const sellerProfile = order.seller.sellerProfile;

      bankDetails = {
        referenceCode,
        bankName: 'Ziraat Bankasi',
        iban: 'TR00 0000 0000 0000 0000 0000 00',
        accountHolder: 'Muzayede Platform A.S.',
        amount: totalAmount,
        currency: order.currency,
        description: `${order.orderNumber} numarali siparis odemesi - Ref: ${referenceCode}`,
      };

      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { providerRef: referenceCode },
      });
    } else if (dto.method === 'ESCROW') {
      escrowRecord = await this.escrowService.createEscrow(
        order.id,
        totalAmount,
      );
    }

    return {
      paymentId: payment.id,
      orderId: order.id,
      orderNumber: order.orderNumber,
      method: dto.method,
      amount: totalAmount,
      currency: order.currency,
      status: payment.status,
      commission: {
        buyerCommission: commission.buyerCommission,
        sellerCommission: commission.sellerCommission,
        buyerRate: commission.buyerRate,
        sellerRate: commission.sellerRate,
      },
      redirectUrl,
      bankDetails,
      escrow: escrowRecord
        ? { escrowId: escrowRecord.id, holdUntil: escrowRecord.holdUntil }
        : null,
    };
  }

  /**
   * Handle iyzico callback.
   * 1. Verify iyzico callback signature
   * 2. Find Payment by providerRef
   * 3. Update Payment status
   * 4. If COMPLETED: update Order status to PAID, create Invoice
   * 5. Create AuditLog
   */
  async handleCallback(payload: { token: string }) {
    this.logger.log(`Payment callback received`);

    const verificationResult = await this.iyzicoService.verifyCallback(
      payload.token,
    );

    const payment = await this.prisma.payment.findFirst({
      where: { providerRef: payload.token },
      include: { order: true },
    });

    if (!payment) {
      this.logger.error(`Payment not found for token: ${payload.token}`);
      throw new NotFoundException('Payment not found for callback token');
    }

    if (verificationResult.status === 'success') {
      await this.prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: 'COMPLETED',
            paidAt: new Date(),
            providerRef: verificationResult.paymentId || payment.providerRef,
          },
        });

        await tx.order.update({
          where: { id: payment.orderId },
          data: { status: 'PAID' },
        });

        await tx.auditLog.create({
          data: {
            userId: payment.order.buyerId,
            action: 'payment.completed',
            entityType: 'Payment',
            entityId: payment.id,
            metadata: {
              orderId: payment.orderId,
              iyzicoPaymentId: verificationResult.paymentId,
              amount: verificationResult.paidPrice,
              fraudStatus: verificationResult.fraudStatus,
            },
          },
        });
      });

      try {
        await this.invoiceService.generateInvoice(payment.orderId);
      } catch (err) {
        this.logger.error(`Invoice generation failed: ${err.message}`);
      }

      this.logger.log(
        `Payment completed: paymentId=${payment.id}, orderId=${payment.orderId}`,
      );

      return { success: true, paymentId: payment.id, status: 'COMPLETED' };
    } else {
      await this.prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: 'FAILED',
            failureReason: `Iyzico verification failed: ${verificationResult.status}`,
          },
        });

        await tx.auditLog.create({
          data: {
            userId: payment.order.buyerId,
            action: 'payment.failed',
            entityType: 'Payment',
            entityId: payment.id,
            metadata: {
              orderId: payment.orderId,
              reason: verificationResult.status,
              fraudStatus: verificationResult.fraudStatus,
            },
          },
        });
      });

      this.logger.warn(
        `Payment failed: paymentId=${payment.id}, status=${verificationResult.status}`,
      );

      return { success: false, paymentId: payment.id, status: 'FAILED' };
    }
  }

  /**
   * Get payment with order, buyer, seller relations.
   */
  async getPayment(id: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            buyer: { include: { profile: true } },
            seller: { include: { profile: true, sellerProfile: true } },
            auction: true,
            invoices: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }

    return payment;
  }

  /**
   * List payments for a given order.
   */
  async getPaymentsByOrder(orderId: string) {
    const payments = await this.prisma.payment.findMany({
      where: { orderId },
      include: {
        order: {
          include: {
            buyer: { include: { profile: true } },
            seller: { include: { profile: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return payments;
  }

  /**
   * Get payments for an auction (via orders linked to auction).
   */
  async getPaymentByAuction(auctionId: string) {
    const payments = await this.prisma.payment.findMany({
      where: {
        order: {
          auctionId,
        },
      },
      include: {
        order: {
          include: {
            buyer: { include: { profile: true } },
            seller: { include: { profile: true } },
            auction: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return payments;
  }

  /**
   * Process a refund for a payment.
   * Calls iyzico refund API, updates status, creates AuditLog.
   */
  async refund(paymentId: string, reason: string) {
    this.logger.log(
      `Refund requested for payment: ${paymentId}, reason: ${reason}`,
    );

    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { order: true },
    });

    if (!payment) {
      throw new NotFoundException(`Payment ${paymentId} not found`);
    }

    if (payment.status !== 'COMPLETED') {
      throw new BadRequestException(
        `Cannot refund payment in '${payment.status}' status`,
      );
    }

    let refundResult: any = { refundId: '', status: 'success' };

    if (payment.method === 'CREDIT_CARD' && payment.providerRef) {
      refundResult = await this.iyzicoService.processRefund({
        providerRef: payment.providerRef,
        amount: Number(payment.amount),
        currency: payment.currency,
      });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: 'REFUNDED',
          failureReason: `Refund: ${reason}`,
        },
      });

      await tx.order.update({
        where: { id: payment.orderId },
        data: { status: 'REFUNDED' },
      });

      await tx.auditLog.create({
        data: {
          userId: payment.order.buyerId,
          action: 'payment.refunded',
          entityType: 'Payment',
          entityId: paymentId,
          metadata: {
            orderId: payment.orderId,
            reason,
            amount: Number(payment.amount),
            refundId: refundResult.refundId,
          },
        },
      });
    });

    return {
      paymentId,
      refundId: refundResult.refundId,
      status: 'REFUNDED',
      reason,
      amount: Number(payment.amount),
    };
  }

  /**
   * Release escrow funds to seller.
   * Validates conditions met, transfers to seller, updates payout record.
   */
  async releaseEscrow(escrowId: string) {
    this.logger.log(`Releasing escrow: ${escrowId}`);
    return this.escrowService.releaseEscrow(escrowId);
  }

  /**
   * Paginated list of seller payouts.
   */
  async getSellerPayouts(sellerId: string, page: number, limit: number) {
    this.logger.log(`Getting payouts for seller: ${sellerId}`);

    const skip = (page - 1) * limit;

    const [payouts, total] = await Promise.all([
      this.prisma.sellerPayout.findMany({
        where: { sellerId },
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
      this.prisma.sellerPayout.count({ where: { sellerId } }),
    ]);

    return {
      data: payouts,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Process pending payouts that are past their scheduled date.
   */
  async processPayouts() {
    this.logger.log('Processing pending payouts...');

    const pendingPayouts = await this.prisma.sellerPayout.findMany({
      where: {
        status: 'PENDING',
        scheduledDate: { lte: new Date() },
      },
      include: {
        seller: true,
        order: true,
      },
    });

    const results: any[] = [];

    for (const payout of pendingPayouts) {
      try {
        await this.prisma.sellerPayout.update({
          where: { id: payout.id },
          data: { status: 'PROCESSING' },
        });

        await this.prisma.auditLog.create({
          data: {
            action: 'payout.processing',
            entityType: 'SellerPayout',
            entityId: payout.id,
            metadata: {
              sellerId: payout.sellerId,
              orderId: payout.orderId,
              netAmount: Number(payout.netAmount),
            },
          },
        });

        results.push({
          payoutId: payout.id,
          sellerId: payout.sellerId,
          netAmount: Number(payout.netAmount),
          status: 'PROCESSING',
        });
      } catch (err) {
        this.logger.error(
          `Failed to process payout ${payout.id}: ${err.message}`,
        );
        results.push({
          payoutId: payout.id,
          sellerId: payout.sellerId,
          status: 'ERROR',
          error: err.message,
        });
      }
    }

    this.logger.log(`Processed ${results.length} payouts`);
    return { processed: results.length, payouts: results };
  }

  /**
   * Get invoice for a payment (via order).
   */
  async getInvoice(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        order: {
          include: { invoices: true },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException(`Payment ${paymentId} not found`);
    }

    const invoice = payment.order.invoices[0];
    if (!invoice) {
      return this.invoiceService.generateInvoice(payment.orderId);
    }

    return this.invoiceService.getInvoice(invoice.id);
  }
}
