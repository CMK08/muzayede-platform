import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);
  private readonly KDV_RATE = 0.20;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate an invoice for an order.
   * Fetches order with all relations, calculates KDV (VAT),
   * and creates an Invoice record.
   */
  async generateInvoice(orderId: string) {
    this.logger.log(`Generating invoice for order: ${orderId}`);

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        buyer: {
          include: { profile: true, sellerProfile: true },
        },
        seller: {
          include: { profile: true, sellerProfile: true },
        },
        auction: true,
        bid: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    const invoiceNumber = await this.generateInvoiceNumber();

    const subtotal = Number(order.hammerPrice) + Number(order.buyerCommission);
    const kdvAmount = Math.round(subtotal * this.KDV_RATE * 100) / 100;
    const totalAmount = subtotal + kdvAmount;

    const isBusiness = !!order.buyer.sellerProfile?.taxId;
    const invoiceType = isBusiness ? 'E_INVOICE' : 'E_ARCHIVE';

    const invoice = await this.prisma.invoice.create({
      data: {
        orderId: order.id,
        type: invoiceType as any,
        invoiceNumber,
        amount: subtotal,
        vatAmount: kdvAmount,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: order.buyerId,
        action: 'invoice.generated',
        entityType: 'Invoice',
        entityId: invoice.id,
        metadata: {
          invoiceNumber,
          orderId: order.id,
          type: invoiceType,
          amount: subtotal,
          vatAmount: kdvAmount,
          totalAmount,
        },
      },
    });

    this.logger.log(`Invoice generated: ${invoiceNumber}, type=${invoiceType}`);

    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      type: invoiceType,
      orderId: order.id,
      orderNumber: order.orderNumber,
      buyer: {
        id: order.buyerId,
        name: order.buyer.profile
          ? `${order.buyer.profile.firstName} ${order.buyer.profile.lastName}`
          : order.buyer.email,
        email: order.buyer.email,
        address: order.buyer.profile?.address || '',
        city: order.buyer.profile?.city || '',
      },
      seller: {
        id: order.sellerId,
        name: order.seller.sellerProfile?.storeName ||
          (order.seller.profile
            ? `${order.seller.profile.firstName} ${order.seller.profile.lastName}`
            : order.seller.email),
        taxId: order.seller.sellerProfile?.taxId || '',
      },
      items: [
        {
          description: `${order.auction.title} - Muzayede Alimi`,
          hammerPrice: Number(order.hammerPrice),
          buyerCommission: Number(order.buyerCommission),
        },
      ],
      subtotal,
      kdvRate: this.KDV_RATE,
      kdvAmount,
      totalAmount,
      currency: order.currency,
      issuedAt: invoice.issuedAt,
      pdfUrl: invoice.pdfUrl,
    };
  }

  /**
   * Get an invoice by its ID with full order relations.
   */
  async getInvoice(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            buyer: { include: { profile: true } },
            seller: { include: { profile: true, sellerProfile: true } },
            auction: true,
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice ${id} not found`);
    }

    const order = invoice.order;

    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      type: invoice.type,
      orderId: order.id,
      orderNumber: order.orderNumber,
      buyer: {
        id: order.buyerId,
        name: order.buyer.profile
          ? `${order.buyer.profile.firstName} ${order.buyer.profile.lastName}`
          : order.buyer.email,
        email: order.buyer.email,
      },
      seller: {
        id: order.sellerId,
        name: order.seller.sellerProfile?.storeName || order.seller.email,
        taxId: order.seller.sellerProfile?.taxId || '',
      },
      amount: Number(invoice.amount),
      vatAmount: Number(invoice.vatAmount),
      totalAmount: Number(invoice.amount) + Number(invoice.vatAmount),
      currency: order.currency,
      pdfUrl: invoice.pdfUrl,
      gibUuid: invoice.gibUuid,
      issuedAt: invoice.issuedAt,
      createdAt: invoice.createdAt,
    };
  }

  /**
   * Send invoice to buyer via email.
   * In a real implementation, this would integrate with an email service
   * (e.g., SendGrid, SES). Here we log the action and return a confirmation.
   */
  async sendInvoiceEmail(invoiceId: string) {
    this.logger.log(`Sending invoice email: invoiceId=${invoiceId}`);

    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        order: {
          include: {
            buyer: { include: { profile: true } },
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice ${invoiceId} not found`);
    }

    const buyerEmail = invoice.order.buyer.email;
    const buyerName = invoice.order.buyer.profile
      ? `${invoice.order.buyer.profile.firstName} ${invoice.order.buyer.profile.lastName}`
      : buyerEmail;

    await this.prisma.auditLog.create({
      data: {
        userId: invoice.order.buyerId,
        action: 'invoice.email_sent',
        entityType: 'Invoice',
        entityId: invoiceId,
        metadata: {
          invoiceNumber: invoice.invoiceNumber,
          recipientEmail: buyerEmail,
          recipientName: buyerName,
        },
      },
    });

    this.logger.log(
      `Invoice email sent: ${invoice.invoiceNumber} -> ${buyerEmail}`,
    );

    return {
      invoiceId,
      invoiceNumber: invoice.invoiceNumber,
      sentTo: buyerEmail,
      recipientName: buyerName,
      status: 'sent',
      sentAt: new Date().toISOString(),
    };
  }

  /**
   * Generate a unique invoice number: MZY-YYYY-XXXXXX
   */
  private async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `MZY-${year}-`;

    const latestInvoice = await this.prisma.invoice.findFirst({
      where: {
        invoiceNumber: { startsWith: prefix },
      },
      orderBy: { invoiceNumber: 'desc' },
    });

    let nextSeq = 1;
    if (latestInvoice) {
      const lastSeq = parseInt(
        latestInvoice.invoiceNumber.replace(prefix, ''),
        10,
      );
      if (!isNaN(lastSeq)) {
        nextSeq = lastSeq + 1;
      }
    }

    return `${prefix}${String(nextSeq).padStart(6, '0')}`;
  }
}
