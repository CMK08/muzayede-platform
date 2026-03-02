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

export interface OrderSummary {
  id: string;
  orderNumber: string;
  auctionId: string;
  bidId: string;
  buyerId: string;
  sellerId: string;
  hammerPrice: number;
  buyerCommission: number;
  sellerCommission: number;
  vatRate: number;
  vatAmount: number;
  totalAmount: number;
  currency: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

// ----------------------------------------------------------------
// Service
// ----------------------------------------------------------------

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);
  private readonly VAT_RATE = 0.20;

  constructor(
    private readonly prisma: PrismaService,
    private readonly commissionService: CommissionService,
  ) {}

  /**
   * Create an order after auction win.
   * 1. Find the winning bid
   * 2. Calculate commissions via CommissionService
   * 3. Calculate VAT
   * 4. Generate order number
   * 5. Create Order record
   * 6. Create AuditLog entry
   */
  async createOrder(
    auctionId: string,
    lotId: string | null,
    buyerId: string,
    hammerPrice: number,
  ): Promise<OrderSummary> {
    this.logger.log(
      `Creating order: auctionId=${auctionId}, buyerId=${buyerId}, hammerPrice=${hammerPrice}`,
    );

    // Find the auction
    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
    });

    if (!auction) {
      throw new NotFoundException(`Auction ${auctionId} not found`);
    }

    // Find the winning bid
    const winningBid = await this.prisma.bid.findFirst({
      where: {
        auctionId,
        userId: buyerId,
        isWinning: true,
      },
      orderBy: { amount: 'desc' },
    });

    if (!winningBid) {
      // If no winning bid, find the highest bid from this buyer
      const latestBid = await this.prisma.bid.findFirst({
        where: {
          auctionId,
          userId: buyerId,
        },
        orderBy: { amount: 'desc' },
      });

      if (!latestBid) {
        throw new BadRequestException(
          `No bid found for buyer ${buyerId} in auction ${auctionId}`,
        );
      }

      // Use the latest bid
      return this.createOrderFromBid(
        auction,
        latestBid,
        buyerId,
        hammerPrice,
      );
    }

    return this.createOrderFromBid(
      auction,
      winningBid,
      buyerId,
      hammerPrice,
    );
  }

  /**
   * Get order details by ID with all relations.
   */
  async getOrder(orderId: string) {
    this.logger.log(`Getting order: ${orderId}`);

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        auction: true,
        bid: true,
        buyer: { include: { profile: true } },
        seller: { include: { profile: true, sellerProfile: true } },
        payments: true,
        invoices: true,
        shipment: true,
        payout: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    return order;
  }

  /**
   * Update order status.
   */
  async updateOrderStatus(
    orderId: string,
    status: string,
  ): Promise<OrderSummary> {
    this.logger.log(
      `Updating order status: orderId=${orderId}, status=${status}`,
    );

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    const validStatuses = [
      'PENDING_PAYMENT',
      'PAID',
      'SHIPPED',
      'DELIVERED',
      'COMPLETED',
      'REFUNDED',
      'CANCELLED',
      'DISPUTED',
    ];

    if (!validStatuses.includes(status)) {
      throw new BadRequestException(
        `Invalid status: ${status}. Valid statuses: ${validStatuses.join(', ')}`,
      );
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: status as any },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: order.buyerId,
        action: 'order.status_updated',
        entityType: 'Order',
        entityId: orderId,
        metadata: {
          previousStatus: order.status,
          newStatus: status,
        },
      },
    });

    return this.toOrderSummary(updated);
  }

  /**
   * List user orders with pagination and optional filters.
   */
  async getUserOrders(
    userId: string,
    page = 1,
    limit = 20,
    filters?: {
      status?: string;
      role?: 'buyer' | 'seller';
    },
  ): Promise<{
    data: OrderSummary[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    this.logger.log(
      `Getting orders for user: ${userId}, page=${page}, limit=${limit}`,
    );

    const skip = (page - 1) * limit;
    const role = filters?.role || 'buyer';

    const where: any = {};

    if (role === 'buyer') {
      where.buyerId = userId;
    } else {
      where.sellerId = userId;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          auction: true,
          buyer: { include: { profile: true } },
          seller: { include: { profile: true } },
          payments: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data: orders.map((o) => this.toOrderSummary(o)),
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

  private async createOrderFromBid(
    auction: any,
    bid: any,
    buyerId: string,
    hammerPrice: number,
  ): Promise<OrderSummary> {
    // Calculate commissions
    const commission = await this.commissionService.calculateCommission(
      auction.id,
      hammerPrice,
    );

    const subtotal = hammerPrice + commission.buyerCommission;
    const vatAmount = Math.round(subtotal * this.VAT_RATE * 100) / 100;
    const totalAmount = subtotal + vatAmount;

    const orderNumber = await this.generateOrderNumber();

    const order = await this.prisma.order.create({
      data: {
        orderNumber,
        auctionId: auction.id,
        bidId: bid.id,
        buyerId,
        sellerId: auction.createdBy,
        hammerPrice,
        buyerCommission: commission.buyerCommission,
        sellerCommission: commission.sellerCommission,
        vatRate: this.VAT_RATE,
        vatAmount,
        totalAmount,
        currency: auction.currency || 'TRY',
        status: 'PENDING_PAYMENT',
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: buyerId,
        action: 'order.created',
        entityType: 'Order',
        entityId: order.id,
        metadata: {
          orderNumber,
          auctionId: auction.id,
          bidId: bid.id,
          hammerPrice,
          buyerCommission: commission.buyerCommission,
          sellerCommission: commission.sellerCommission,
          vatAmount,
          totalAmount,
        },
      },
    });

    this.logger.log(
      `Order created: ${orderNumber}, total=${totalAmount} ${order.currency}`,
    );

    return this.toOrderSummary(order);
  }

  private async generateOrderNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `ORD-${year}-`;

    const latestOrder = await this.prisma.order.findFirst({
      where: {
        orderNumber: { startsWith: prefix },
      },
      orderBy: { orderNumber: 'desc' },
    });

    let nextSeq = 1;
    if (latestOrder) {
      const lastSeq = parseInt(
        latestOrder.orderNumber.replace(prefix, ''),
        10,
      );
      if (!isNaN(lastSeq)) {
        nextSeq = lastSeq + 1;
      }
    }

    return `${prefix}${String(nextSeq).padStart(6, '0')}`;
  }

  private toOrderSummary(order: any): OrderSummary {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      auctionId: order.auctionId,
      bidId: order.bidId,
      buyerId: order.buyerId,
      sellerId: order.sellerId,
      hammerPrice: Number(order.hammerPrice),
      buyerCommission: Number(order.buyerCommission),
      sellerCommission: Number(order.sellerCommission),
      vatRate: Number(order.vatRate),
      vatAmount: Number(order.vatAmount),
      totalAmount: Number(order.totalAmount),
      currency: order.currency,
      status: order.status,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }
}
