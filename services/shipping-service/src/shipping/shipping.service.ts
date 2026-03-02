import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

export interface AddressInfo {
  name: string;
  street: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  phone?: string;
}

export interface PackageInfo {
  weight: number;
  dimensions: { length: number; width: number; height: number };
  description?: string;
  declaredValue?: number;
}

export interface TrackingEvent {
  status: string;
  timestamp: string;
  location: string;
  description: string;
}

export interface ShipmentResponse {
  id: string;
  orderId: string;
  carrier: string;
  trackingNumber: string | null;
  trackingUrl: string;
  status: string;
  shippingCost: number;
  weight: number;
  dimensions: string;
  insuranceAmount: number;
  recipientName: string | null;
  deliveryAddress: string | null;
  estimatedDelivery: Date | null;
  createdAt: Date;
}

@Injectable()
export class ShippingService {
  private readonly logger = new Logger(ShippingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Create a shipment for an order.
   */
  async createShipment(
    orderId: string,
    senderAddress: AddressInfo,
    receiverAddress: AddressInfo,
    packageInfo: PackageInfo,
  ): Promise<ShipmentResponse> {
    this.logger.log(`Creating shipment for order: ${orderId}`);

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        buyer: { include: { profile: true } },
        seller: { include: { profile: true } },
        auction: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    if (order.status !== 'PAID') {
      throw new BadRequestException(
        `Order must be in PAID status to create shipment. Current: ${order.status}`,
      );
    }

    const existingShipment = await this.prisma.shipment.findUnique({
      where: { orderId },
    });

    if (existingShipment) {
      throw new BadRequestException(
        `Shipment already exists for order ${orderId}`,
      );
    }

    const carrier = 'UPS';
    const shippingCost = this.calculateShippingCost(
      carrier,
      packageInfo.weight,
      false,
    );
    const trackingNumber = this.generateTrackingNumber(carrier);
    const dimensionsStr = `${packageInfo.dimensions.length}x${packageInfo.dimensions.width}x${packageInfo.dimensions.height}`;

    const estimatedDelivery = new Date();
    estimatedDelivery.setDate(
      estimatedDelivery.getDate() + this.getEstimatedDays(carrier),
    );

    const shipment = await this.prisma.$transaction(async (tx) => {
      const newShipment = await tx.shipment.create({
        data: {
          orderId,
          carrier: carrier as any,
          trackingNumber,
          weight: packageInfo.weight,
          dimensions: dimensionsStr,
          insuranceAmount: packageInfo.declaredValue || 0,
          shippingCost,
          status: 'PREPARING',
          estimatedDelivery,
          recipientName: receiverAddress.name,
          deliveryAddress: `${receiverAddress.street}, ${receiverAddress.city}, ${receiverAddress.postalCode}, ${receiverAddress.country}`,
        },
      });

      await tx.order.update({
        where: { id: orderId },
        data: { status: 'SHIPPED' },
      });

      await tx.auditLog.create({
        data: {
          userId: order.sellerId,
          action: 'shipment.created',
          entityType: 'Shipment',
          entityId: newShipment.id,
          metadata: {
            orderId,
            carrier,
            trackingNumber,
            shippingCost,
            weight: packageInfo.weight,
            dimensions: dimensionsStr,
            senderAddress: JSON.parse(JSON.stringify(senderAddress)),
            receiverAddress: JSON.parse(JSON.stringify(receiverAddress)),
          },
        },
      });

      return newShipment;
    });

    const trackingUrl = this.getTrackingUrl(carrier, trackingNumber);

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
      dimensions: shipment.dimensions || dimensionsStr,
      insuranceAmount: Number(shipment.insuranceAmount),
      recipientName: shipment.recipientName,
      deliveryAddress: shipment.deliveryAddress,
      estimatedDelivery: shipment.estimatedDelivery,
      createdAt: shipment.createdAt,
    };
  }

  /**
   * Get current shipment status by shipment ID.
   */
  async getShipmentStatus(shipmentId: string) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
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
      throw new NotFoundException(`Shipment ${shipmentId} not found`);
    }

    return {
      id: shipment.id,
      orderId: shipment.orderId,
      carrier: shipment.carrier,
      trackingNumber: shipment.trackingNumber,
      status: shipment.status,
      shippingCost: shipment.shippingCost ? Number(shipment.shippingCost) : null,
      weight: shipment.weight ? Number(shipment.weight) : null,
      dimensions: shipment.dimensions,
      insuranceAmount: shipment.insuranceAmount
        ? Number(shipment.insuranceAmount)
        : null,
      recipientName: shipment.recipientName,
      deliveryAddress: shipment.deliveryAddress,
      estimatedDelivery: shipment.estimatedDelivery,
      deliveredAt: shipment.deliveredAt,
      labelUrl: shipment.labelUrl,
      deliveryPhotoUrl: shipment.deliveryPhotoUrl,
      createdAt: shipment.createdAt,
      updatedAt: shipment.updatedAt,
      order: shipment.order,
    };
  }

  /**
   * Find shipment by order ID.
   */
  async getShipmentByOrder(orderId: string) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { orderId },
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
      throw new NotFoundException(`No shipment found for order ${orderId}`);
    }

    return {
      id: shipment.id,
      orderId: shipment.orderId,
      carrier: shipment.carrier,
      trackingNumber: shipment.trackingNumber,
      status: shipment.status,
      shippingCost: shipment.shippingCost ? Number(shipment.shippingCost) : null,
      weight: shipment.weight ? Number(shipment.weight) : null,
      dimensions: shipment.dimensions,
      insuranceAmount: shipment.insuranceAmount
        ? Number(shipment.insuranceAmount)
        : null,
      recipientName: shipment.recipientName,
      deliveryAddress: shipment.deliveryAddress,
      estimatedDelivery: shipment.estimatedDelivery,
      deliveredAt: shipment.deliveredAt,
      labelUrl: shipment.labelUrl,
      createdAt: shipment.createdAt,
      updatedAt: shipment.updatedAt,
      order: shipment.order,
    };
  }

  /**
   * Update shipment status with optional location and description.
   * Creates an audit log entry as a tracking event.
   */
  async updateShipmentStatus(
    shipmentId: string,
    status: string,
    location?: string,
    description?: string,
  ) {
    this.logger.log(`Updating shipment status: ${shipmentId} -> ${status}`);

    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: { order: true },
    });

    if (!shipment) {
      throw new NotFoundException(`Shipment ${shipmentId} not found`);
    }

    if (shipment.status === 'DELIVERED') {
      throw new BadRequestException(
        'Cannot update status of a delivered shipment',
      );
    }

    if (shipment.status === 'RETURNED') {
      throw new BadRequestException(
        'Cannot update status of a returned shipment',
      );
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
            description: description || null,
            timestamp: new Date().toISOString(),
          },
        },
      });

      if (status === 'DELIVERED') {
        await tx.order.update({
          where: { id: shipment.orderId },
          data: { status: 'DELIVERED' },
        });
      }

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
      event: {
        status,
        location: location || null,
        description: description || null,
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Get full tracking history for a shipment from audit logs.
   */
  async getTrackingEvents(shipmentId: string): Promise<TrackingEvent[]> {
    this.logger.log(`Getting tracking events for shipment: ${shipmentId}`);

    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
    });

    if (!shipment) {
      throw new NotFoundException(`Shipment ${shipmentId} not found`);
    }

    const auditLogs = await this.prisma.auditLog.findMany({
      where: {
        entityType: 'Shipment',
        entityId: shipmentId,
        action: {
          in: ['shipment.created', 'shipment.status_updated', 'shipment.delivery_confirmed'],
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const events: TrackingEvent[] = [];

    for (const log of auditLogs) {
      const metadata = log.metadata as any;

      if (log.action === 'shipment.created') {
        events.push({
          status: 'PREPARING',
          timestamp: log.createdAt.toISOString(),
          location: 'Origin Warehouse',
          description: 'Shipment order has been created',
        });
      } else if (log.action === 'shipment.status_updated') {
        events.push({
          status: metadata?.newStatus || 'UNKNOWN',
          timestamp: metadata?.timestamp || log.createdAt.toISOString(),
          location: metadata?.location || 'In Transit',
          description: metadata?.description || `Status changed to ${metadata?.newStatus}`,
        });
      } else if (log.action === 'shipment.delivery_confirmed') {
        events.push({
          status: 'DELIVERED',
          timestamp: metadata?.deliveredAt || log.createdAt.toISOString(),
          location: 'Delivery Address',
          description: 'Delivery confirmed by buyer',
        });
      }
    }

    // If no audit logs, build a minimal timeline from the shipment itself
    if (events.length === 0) {
      events.push({
        status: 'PREPARING',
        timestamp: shipment.createdAt.toISOString(),
        location: 'Origin Warehouse',
        description: 'Shipment order has been created',
      });

      if (shipment.status !== 'PREPARING') {
        events.push({
          status: shipment.status,
          timestamp: shipment.updatedAt.toISOString(),
          location: 'In Transit',
          description: `Current status: ${shipment.status}`,
        });
      }
    }

    return events;
  }

  /**
   * Cancel a shipment if it has not been picked up yet.
   */
  async cancelShipment(shipmentId: string) {
    this.logger.log(`Cancelling shipment: ${shipmentId}`);

    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: { order: true },
    });

    if (!shipment) {
      throw new NotFoundException(`Shipment ${shipmentId} not found`);
    }

    const nonCancellableStatuses = [
      'IN_TRANSIT',
      'OUT_FOR_DELIVERY',
      'DELIVERED',
      'RETURNED',
    ];

    if (nonCancellableStatuses.includes(shipment.status)) {
      throw new BadRequestException(
        `Cannot cancel shipment in ${shipment.status} status. Only PREPARING, LABEL_CREATED, or PICKED_UP shipments can be cancelled.`,
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.shipment.update({
        where: { id: shipmentId },
        data: { status: 'RETURNED' as any },
      });

      await tx.order.update({
        where: { id: shipment.orderId },
        data: { status: 'PAID' },
      });

      await tx.auditLog.create({
        data: {
          action: 'shipment.cancelled',
          entityType: 'Shipment',
          entityId: shipmentId,
          metadata: {
            orderId: shipment.orderId,
            previousStatus: shipment.status,
            cancelledAt: new Date().toISOString(),
          },
        },
      });

      return updated;
    });

    this.logger.log(`Shipment ${shipmentId} cancelled`);

    return {
      id: result.id,
      orderId: result.orderId,
      status: result.status,
      message: 'Shipment has been cancelled successfully',
      cancelledAt: new Date().toISOString(),
    };
  }

  /**
   * Calculate shipping cost for a carrier.
   */
  calculateShippingCost(
    carrier: string,
    weight: number,
    whiteGlove: boolean,
  ): number {
    let baseCost: number;

    switch (carrier) {
      case 'UPS':
        baseCost = 40 + weight * 7;
        break;
      case 'DHL':
        baseCost = 45 + weight * 8;
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
  generateTrackingNumber(carrier: string): string {
    const prefixes: Record<string, string> = {
      UPS: '1Z',
      DHL: 'DHL',
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
  getEstimatedDays(carrier: string): number {
    switch (carrier) {
      case 'UPS':
        return 3;
      case 'DHL':
        return 4;
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
  getTrackingUrl(carrier: string, trackingNumber: string): string {
    const urls: Record<string, string> = {
      UPS: `https://www.ups.com/track?tracknum=${trackingNumber}`,
      DHL: `https://www.dhl.com/en/express/tracking.html?AWB=${trackingNumber}`,
      WHITE_GLOVE: `https://www.muzayede.com/kargo/takip/${trackingNumber}`,
      SELF_PICKUP: '',
      STORE_PICKUP: '',
    };

    return urls[carrier] || `https://www.muzayede.com/kargo/takip/${trackingNumber}`;
  }
}
