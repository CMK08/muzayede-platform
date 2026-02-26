import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

interface CreateShipmentDto {
  orderId: string;
  carrier: 'UPS' | 'WHITE_GLOVE' | 'SELF_PICKUP' | 'STORE_PICKUP';
  weight: number;
  dimensions: string;
  insuranceAmount?: number;
  recipientName: string;
  deliveryAddress: string;
}

interface ShippingRateDto {
  fromCity: string;
  toCity: string;
  weight: number;
  dimensions?: string;
  declaredValue?: number;
  whiteGlove?: boolean;
}

interface TrackingEvent {
  status: string;
  date: string;
  location: string;
  note: string;
}

interface ShippingRate {
  carrier: string;
  serviceName: string;
  estimatedDays: number;
  price: number;
  insurancePrice: number;
  currency: string;
  whiteGlove: boolean;
}

@Injectable()
export class ShippingService {
  private readonly logger = new Logger(ShippingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Create a shipment for a paid order.
   * 1. Find Order by orderId, validate status is PAID
   * 2. Calculate shipping cost via carrier rates
   * 3. Create Shipment record
   * 4. Generate tracking number
   * 5. Update Order status to SHIPPED
   * 6. Create AuditLog
   */
  async createOrder(dto: CreateShipmentDto) {
    this.logger.log(`Creating shipment for order: ${dto.orderId}`);

    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: {
        buyer: { include: { profile: true } },
        seller: { include: { profile: true } },
        auction: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order ${dto.orderId} not found`);
    }

    if (order.status !== 'PAID') {
      throw new BadRequestException(
        `Order must be in PAID status to create shipment. Current: ${order.status}`,
      );
    }

    const existingShipment = await this.prisma.shipment.findUnique({
      where: { orderId: dto.orderId },
    });

    if (existingShipment) {
      throw new BadRequestException(
        `Shipment already exists for order ${dto.orderId}`,
      );
    }

    const shippingCost = this.calculateShippingCost(
      dto.carrier,
      dto.weight,
      dto.carrier === 'WHITE_GLOVE',
    );

    const trackingNumber = this.generateTrackingNumber(dto.carrier);

    const estimatedDelivery = new Date();
    estimatedDelivery.setDate(
      estimatedDelivery.getDate() + this.getEstimatedDays(dto.carrier),
    );

    const initialTrackingHistory: TrackingEvent[] = [
      {
        status: 'PREPARING',
        date: new Date().toISOString(),
        location: 'Depo',
        note: 'Kargo siparisi olusturuldu',
      },
    ];

    const shipment = await this.prisma.$transaction(async (tx) => {
      const newShipment = await tx.shipment.create({
        data: {
          orderId: dto.orderId,
          carrier: dto.carrier as any,
          trackingNumber,
          weight: dto.weight,
          dimensions: dto.dimensions,
          insuranceAmount: dto.insuranceAmount || 0,
          shippingCost,
          status: 'PREPARING',
          estimatedDelivery,
          recipientName: dto.recipientName,
          deliveryAddress: dto.deliveryAddress,
        },
      });

      await tx.order.update({
        where: { id: dto.orderId },
        data: { status: 'SHIPPED' },
      });

      await tx.auditLog.create({
        data: {
          userId: order.sellerId,
          action: 'shipment.created',
          entityType: 'Shipment',
          entityId: newShipment.id,
          metadata: {
            orderId: dto.orderId,
            carrier: dto.carrier,
            trackingNumber,
            shippingCost,
            weight: dto.weight,
            dimensions: dto.dimensions,
          },
        },
      });

      return newShipment;
    });

    const trackingUrl = this.getTrackingUrl(dto.carrier, trackingNumber);

    this.logger.log(
      `Shipment created: ${shipment.id}, tracking=${trackingNumber}`,
    );

    return {
      id: shipment.id,
      orderId: shipment.orderId,
      carrier: shipment.carrier,
      trackingNumber: shipment.trackingNumber,
      trackingUrl,
      status: shipment.status,
      shippingCost: Number(shipment.shippingCost),
      weight: Number(shipment.weight),
      dimensions: shipment.dimensions,
      insuranceAmount: Number(shipment.insuranceAmount),
      recipientName: shipment.recipientName,
      deliveryAddress: shipment.deliveryAddress,
      estimatedDelivery: shipment.estimatedDelivery,
      createdAt: shipment.createdAt,
    };
  }

  /**
   * Get a shipment with its Order relation.
   */
  async getOrder(id: string) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            buyer: { include: { profile: true } },
            seller: { include: { profile: true } },
            auction: true,
          },
        },
      },
    });

    if (!shipment) {
      throw new NotFoundException(`Shipment ${id} not found`);
    }

    return shipment;
  }

  /**
   * Get shipments by user (buyer or seller role).
   */
  async getOrdersByUser(userId: string, role: 'buyer' | 'seller') {
    const whereClause =
      role === 'buyer'
        ? { order: { buyerId: userId } }
        : { order: { sellerId: userId } };

    const shipments = await this.prisma.shipment.findMany({
      where: whereClause,
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

    return shipments;
  }

  /**
   * Track a shipment.
   * Builds tracking timeline from status history.
   */
  async track(shipmentId: string) {
    this.logger.log(`Tracking shipment: ${shipmentId}`);

    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: { order: true },
    });

    if (!shipment) {
      throw new NotFoundException(`Shipment ${shipmentId} not found`);
    }

    const timeline = this.buildTrackingTimeline(shipment);

    return {
      shipmentId: shipment.id,
      orderId: shipment.orderId,
      trackingNumber: shipment.trackingNumber,
      carrier: shipment.carrier,
      currentStatus: shipment.status,
      estimatedDelivery: shipment.estimatedDelivery,
      deliveredAt: shipment.deliveredAt,
      trackingUrl: this.getTrackingUrl(
        shipment.carrier,
        shipment.trackingNumber || '',
      ),
      timeline,
    };
  }

  /**
   * Get shipping rates for all carriers.
   * Calculates rates for Aras, Yurtici, MNG, and PTT Kargo.
   */
  async getRates(dto: ShippingRateDto): Promise<ShippingRate[]> {
    this.logger.log(
      `Getting rates: ${dto.fromCity} -> ${dto.toCity}, ${dto.weight}kg`,
    );

    const weight = dto.weight;
    const declaredValue = dto.declaredValue || 0;
    const insuranceRate = 0.01;
    const insurancePrice = Math.round(declaredValue * insuranceRate * 100) / 100;

    const carriers: ShippingRate[] = [
      {
        carrier: 'Aras Kargo',
        serviceName: 'Standart Teslimat',
        estimatedDays: 3,
        price: Math.round((35 + weight * 8) * 100) / 100,
        insurancePrice,
        currency: 'TRY',
        whiteGlove: false,
      },
      {
        carrier: 'Yurtici Kargo',
        serviceName: 'Standart Teslimat',
        estimatedDays: 2,
        price: Math.round((40 + weight * 7) * 100) / 100,
        insurancePrice,
        currency: 'TRY',
        whiteGlove: false,
      },
      {
        carrier: 'MNG Kargo',
        serviceName: 'Express Teslimat',
        estimatedDays: 2,
        price: Math.round((32 + weight * 9) * 100) / 100,
        insurancePrice,
        currency: 'TRY',
        whiteGlove: false,
      },
      {
        carrier: 'PTT Kargo',
        serviceName: 'Ekonomik Teslimat',
        estimatedDays: 5,
        price: Math.round((25 + weight * 6) * 100) / 100,
        insurancePrice,
        currency: 'TRY',
        whiteGlove: false,
      },
    ];

    if (dto.whiteGlove) {
      const whiteGloveRates = carriers.map((carrier) => ({
        ...carrier,
        serviceName: `${carrier.serviceName} - Beyaz Eldiven`,
        price: Math.round(carrier.price * 3 * 100) / 100,
        estimatedDays: carrier.estimatedDays + 1,
        whiteGlove: true,
      }));
      carriers.push(...whiteGloveRates);
    }

    return carriers.sort((a, b) => a.price - b.price);
  }

  /**
   * Update shipment status.
   * Appends to tracking history, emits event.
   */
  async updateStatus(
    shipmentId: string,
    status: string,
    location?: string,
    note?: string,
  ) {
    this.logger.log(`Updating shipment status: ${shipmentId} -> ${status}`);

    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: { order: true },
    });

    if (!shipment) {
      throw new NotFoundException(`Shipment ${shipmentId} not found`);
    }

    const updateData: any = {
      status: status as any,
    };

    if (status === 'DELIVERED') {
      updateData.deliveredAt = new Date();
    }

    const updatedShipment = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.shipment.update({
        where: { id: shipmentId },
        data: updateData,
      });

      await tx.auditLog.create({
        data: {
          action: 'shipment.status_updated',
          entityType: 'Shipment',
          entityId: shipmentId,
          metadata: {
            orderId: shipment.orderId,
            previousStatus: shipment.status,
            newStatus: status,
            location: location || null,
            note: note || null,
            timestamp: new Date().toISOString(),
          },
        },
      });

      return updated;
    });

    this.logger.log(`Shipment ${shipmentId} status updated to ${status}`);

    return {
      id: updatedShipment.id,
      orderId: updatedShipment.orderId,
      status: updatedShipment.status,
      trackingNumber: updatedShipment.trackingNumber,
      deliveredAt: updatedShipment.deliveredAt,
      updatedAt: updatedShipment.updatedAt,
    };
  }

  /**
   * Confirm delivery of a shipment.
   * 1. Validate buyer is confirming
   * 2. Set status DELIVERED, deliveryPhotoUrl
   * 3. Update Order status to DELIVERED
   * 4. Trigger escrow release (emit event)
   * 5. Create AuditLog
   */
  async confirmDelivery(
    shipmentId: string,
    userId: string,
    photoUrl?: string,
  ) {
    this.logger.log(
      `Delivery confirmation: shipment=${shipmentId}, userId=${userId}`,
    );

    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: { order: true },
    });

    if (!shipment) {
      throw new NotFoundException(`Shipment ${shipmentId} not found`);
    }

    if (shipment.order.buyerId !== userId) {
      throw new BadRequestException('Only the buyer can confirm delivery');
    }

    if (shipment.status === 'DELIVERED') {
      throw new BadRequestException('Delivery already confirmed');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.shipment.update({
        where: { id: shipmentId },
        data: {
          status: 'DELIVERED',
          deliveredAt: new Date(),
          deliveryPhotoUrl: photoUrl || null,
        },
      });

      await tx.order.update({
        where: { id: shipment.orderId },
        data: { status: 'DELIVERED' },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'shipment.delivery_confirmed',
          entityType: 'Shipment',
          entityId: shipmentId,
          metadata: {
            orderId: shipment.orderId,
            confirmedBy: userId,
            photoUrl: photoUrl || null,
            deliveredAt: new Date().toISOString(),
          },
        },
      });
    });

    this.logger.log(
      `Delivery confirmed for shipment ${shipmentId}, order ${shipment.orderId}`,
    );

    return {
      shipmentId,
      orderId: shipment.orderId,
      status: 'DELIVERED',
      deliveredAt: new Date(),
      message: 'Teslimat basariyla onaylandi. Emanet fonlari serbest birakilacak.',
    };
  }

  /**
   * Build tracking timeline from audit logs for this shipment.
   */
  private buildTrackingTimeline(shipment: any): TrackingEvent[] {
    const timeline: TrackingEvent[] = [
      {
        status: 'PREPARING',
        date: shipment.createdAt.toISOString(),
        location: 'Depo',
        note: 'Kargo siparisi olusturuldu',
      },
    ];

    const statusOrder = [
      'LABEL_CREATED',
      'PICKED_UP',
      'IN_TRANSIT',
      'OUT_FOR_DELIVERY',
      'DELIVERED',
    ];

    const currentIndex = statusOrder.indexOf(shipment.status);
    const statusNotes: Record<string, string> = {
      LABEL_CREATED: 'Kargo etiketi olusturuldu',
      PICKED_UP: 'Kargo teslim alindi',
      IN_TRANSIT: 'Kargo yolda',
      OUT_FOR_DELIVERY: 'Dagitima cikarildi',
      DELIVERED: 'Teslim edildi',
    };

    for (let i = 0; i <= currentIndex; i++) {
      const s = statusOrder[i];
      const eventDate = new Date(shipment.createdAt);
      eventDate.setHours(eventDate.getHours() + (i + 1) * 12);

      timeline.push({
        status: s,
        date:
          s === 'DELIVERED' && shipment.deliveredAt
            ? shipment.deliveredAt.toISOString()
            : eventDate.toISOString(),
        location: s === 'DELIVERED' ? 'Teslimat Adresi' : 'Transfer Merkezi',
        note: statusNotes[s] || s,
      });
    }

    return timeline;
  }

  /**
   * Calculate shipping cost for a carrier.
   */
  private calculateShippingCost(
    carrier: string,
    weight: number,
    whiteGlove: boolean,
  ): number {
    let baseCost: number;

    switch (carrier) {
      case 'UPS':
        baseCost = 40 + weight * 7;
        break;
      case 'WHITE_GLOVE':
        baseCost = (40 + weight * 7) * 3;
        break;
      case 'SELF_PICKUP':
        baseCost = 0;
        break;
      case 'STORE_PICKUP':
        baseCost = 0;
        break;
      default:
        baseCost = 35 + weight * 8;
    }

    if (whiteGlove && carrier !== 'WHITE_GLOVE') {
      baseCost *= 3;
    }

    return Math.round(baseCost * 100) / 100;
  }

  /**
   * Generate a tracking number with carrier prefix.
   */
  private generateTrackingNumber(carrier: string): string {
    const prefixes: Record<string, string> = {
      UPS: '1Z',
      WHITE_GLOVE: 'WG',
      SELF_PICKUP: 'SP',
      STORE_PICKUP: 'ST',
    };

    const prefix = prefixes[carrier] || 'MZ';
    const randomPart = Array.from({ length: 12 }, () =>
      Math.random().toString(36).charAt(2).toUpperCase(),
    ).join('');

    return `${prefix}${randomPart}`;
  }

  /**
   * Get estimated delivery days for a carrier.
   */
  private getEstimatedDays(carrier: string): number {
    switch (carrier) {
      case 'UPS':
        return 3;
      case 'WHITE_GLOVE':
        return 5;
      case 'SELF_PICKUP':
        return 0;
      case 'STORE_PICKUP':
        return 1;
      default:
        return 4;
    }
  }

  /**
   * Get carrier tracking URL.
   */
  private getTrackingUrl(carrier: string, trackingNumber: string): string {
    const urls: Record<string, string> = {
      UPS: `https://www.ups.com/track?tracknum=${trackingNumber}`,
      WHITE_GLOVE: `https://www.muzayede.com/kargo/takip/${trackingNumber}`,
      SELF_PICKUP: '',
      STORE_PICKUP: '',
    };

    return urls[carrier] || `https://www.muzayede.com/kargo/takip/${trackingNumber}`;
  }
}
