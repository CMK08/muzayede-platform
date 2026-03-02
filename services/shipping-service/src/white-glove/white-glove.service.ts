import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface WhiteGloveRequest {
  shipmentId: string;
  requestId: string;
  specialInstructions: string;
  status: string;
  handlingType: string;
  additionalCost: number;
  currency: string;
  createdAt: string;
}

export interface PickupSchedule {
  shipmentId: string;
  pickupDate: string;
  pickupWindow: string;
  status: string;
  contactPhone: string | null;
  specialInstructions: string | null;
  scheduledAt: string;
}

export interface DeliverySchedule {
  shipmentId: string;
  deliveryDate: string;
  deliveryWindow: string;
  status: string;
  contactPhone: string | null;
  specialInstructions: string | null;
  scheduledAt: string;
}

export interface WhiteGloveStatus {
  shipmentId: string;
  orderId: string;
  carrier: string;
  shipmentStatus: string;
  whiteGlove: {
    isActive: boolean;
    requestId: string | null;
    specialInstructions: string | null;
    handlingType: string | null;
    additionalCost: number | null;
  };
  pickup: {
    scheduled: boolean;
    date: string | null;
    window: string | null;
    status: string | null;
  };
  delivery: {
    scheduled: boolean;
    date: string | null;
    window: string | null;
    status: string | null;
  };
}

@Injectable()
export class WhiteGloveService {
  private readonly logger = new Logger(WhiteGloveService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Request white glove service for a shipment.
   */
  async requestWhiteGlove(
    shipmentId: string,
    specialInstructions: string,
  ): Promise<WhiteGloveRequest> {
    this.logger.log(`Requesting white glove service for shipment: ${shipmentId}`);

    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: { order: true },
    });

    if (!shipment) {
      throw new NotFoundException(`Shipment ${shipmentId} not found`);
    }

    if (shipment.status === 'DELIVERED' || shipment.status === 'RETURNED') {
      throw new BadRequestException(
        `Cannot add white glove service to a ${shipment.status} shipment`,
      );
    }

    // Check if white glove is already requested
    const existingRequest = await this.prisma.auditLog.findFirst({
      where: {
        entityType: 'Shipment',
        entityId: shipmentId,
        action: 'shipment.white_glove_requested',
      },
    });

    if (existingRequest) {
      throw new BadRequestException(
        'White glove service has already been requested for this shipment',
      );
    }

    const requestId = this.generateRequestId();
    const baseWeight = shipment.weight ? Number(shipment.weight) : 1;
    const additionalCost = Math.round(baseWeight * 15 * 100) / 100;

    // Determine handling type from instructions
    const handlingType = this.determineHandlingType(specialInstructions);

    const updatedShippingCost =
      (shipment.shippingCost ? Number(shipment.shippingCost) : 0) +
      additionalCost;

    await this.prisma.$transaction(async (tx) => {
      // Update shipping cost to include white glove surcharge
      await tx.shipment.update({
        where: { id: shipmentId },
        data: {
          shippingCost: updatedShippingCost,
          carrier: 'WHITE_GLOVE' as any,
        },
      });

      await tx.auditLog.create({
        data: {
          action: 'shipment.white_glove_requested',
          entityType: 'Shipment',
          entityId: shipmentId,
          metadata: {
            requestId,
            orderId: shipment.orderId,
            specialInstructions,
            handlingType,
            additionalCost,
            previousCarrier: shipment.carrier,
            previousCost: shipment.shippingCost
              ? Number(shipment.shippingCost)
              : 0,
            updatedCost: updatedShippingCost,
          },
        },
      });
    });

    this.logger.log(
      `White glove service requested for shipment ${shipmentId}: request=${requestId}`,
    );

    return {
      shipmentId,
      requestId,
      specialInstructions,
      status: 'CONFIRMED',
      handlingType,
      additionalCost,
      currency: 'USD',
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Schedule a pickup for a white glove shipment.
   */
  async schedulePickup(
    shipmentId: string,
    preferredDate: string,
  ): Promise<PickupSchedule> {
    this.logger.log(
      `Scheduling pickup for shipment: ${shipmentId}, date=${preferredDate}`,
    );

    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: { order: true },
    });

    if (!shipment) {
      throw new NotFoundException(`Shipment ${shipmentId} not found`);
    }

    // Verify white glove is active
    await this.verifyWhiteGloveActive(shipmentId);

    const requestedDate = new Date(preferredDate);
    const now = new Date();

    if (requestedDate <= now) {
      throw new BadRequestException(
        'Pickup date must be in the future',
      );
    }

    // Ensure at least 24 hours notice
    const minDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    if (requestedDate < minDate) {
      throw new BadRequestException(
        'Pickup must be scheduled at least 24 hours in advance',
      );
    }

    const pickupWindow = this.assignPickupWindow(requestedDate);

    await this.prisma.auditLog.create({
      data: {
        action: 'shipment.pickup_scheduled',
        entityType: 'Shipment',
        entityId: shipmentId,
        metadata: {
          orderId: shipment.orderId,
          pickupDate: preferredDate,
          pickupWindow,
          scheduledAt: new Date().toISOString(),
        },
      },
    });

    this.logger.log(
      `Pickup scheduled for shipment ${shipmentId}: ${preferredDate} (${pickupWindow})`,
    );

    return {
      shipmentId,
      pickupDate: preferredDate,
      pickupWindow,
      status: 'SCHEDULED',
      contactPhone: null,
      specialInstructions: null,
      scheduledAt: new Date().toISOString(),
    };
  }

  /**
   * Schedule a delivery for a white glove shipment.
   */
  async scheduleDelivery(
    shipmentId: string,
    preferredDate: string,
  ): Promise<DeliverySchedule> {
    this.logger.log(
      `Scheduling delivery for shipment: ${shipmentId}, date=${preferredDate}`,
    );

    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: { order: true },
    });

    if (!shipment) {
      throw new NotFoundException(`Shipment ${shipmentId} not found`);
    }

    // Verify white glove is active
    await this.verifyWhiteGloveActive(shipmentId);

    const requestedDate = new Date(preferredDate);
    const now = new Date();

    if (requestedDate <= now) {
      throw new BadRequestException(
        'Delivery date must be in the future',
      );
    }

    // Ensure at least 48 hours notice for delivery
    const minDate = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    if (requestedDate < minDate) {
      throw new BadRequestException(
        'Delivery must be scheduled at least 48 hours in advance',
      );
    }

    const deliveryWindow = this.assignDeliveryWindow(requestedDate);

    await this.prisma.auditLog.create({
      data: {
        action: 'shipment.delivery_scheduled',
        entityType: 'Shipment',
        entityId: shipmentId,
        metadata: {
          orderId: shipment.orderId,
          deliveryDate: preferredDate,
          deliveryWindow,
          scheduledAt: new Date().toISOString(),
        },
      },
    });

    this.logger.log(
      `Delivery scheduled for shipment ${shipmentId}: ${preferredDate} (${deliveryWindow})`,
    );

    return {
      shipmentId,
      deliveryDate: preferredDate,
      deliveryWindow,
      status: 'SCHEDULED',
      contactPhone: null,
      specialInstructions: null,
      scheduledAt: new Date().toISOString(),
    };
  }

  /**
   * Get full white glove status including pickup and delivery schedules.
   */
  async getWhiteGloveStatus(shipmentId: string): Promise<WhiteGloveStatus> {
    this.logger.log(`Getting white glove status for shipment: ${shipmentId}`);

    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: { order: true },
    });

    if (!shipment) {
      throw new NotFoundException(`Shipment ${shipmentId} not found`);
    }

    // Get white glove request audit log
    const whiteGloveLog = await this.prisma.auditLog.findFirst({
      where: {
        entityType: 'Shipment',
        entityId: shipmentId,
        action: 'shipment.white_glove_requested',
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get pickup schedule
    const pickupLog = await this.prisma.auditLog.findFirst({
      where: {
        entityType: 'Shipment',
        entityId: shipmentId,
        action: 'shipment.pickup_scheduled',
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get delivery schedule
    const deliveryLog = await this.prisma.auditLog.findFirst({
      where: {
        entityType: 'Shipment',
        entityId: shipmentId,
        action: 'shipment.delivery_scheduled',
      },
      orderBy: { createdAt: 'desc' },
    });

    const whiteGloveMetadata = whiteGloveLog?.metadata as any;
    const pickupMetadata = pickupLog?.metadata as any;
    const deliveryMetadata = deliveryLog?.metadata as any;

    return {
      shipmentId,
      orderId: shipment.orderId,
      carrier: shipment.carrier,
      shipmentStatus: shipment.status,
      whiteGlove: {
        isActive: !!whiteGloveLog,
        requestId: whiteGloveMetadata?.requestId || null,
        specialInstructions:
          whiteGloveMetadata?.specialInstructions || null,
        handlingType: whiteGloveMetadata?.handlingType || null,
        additionalCost: whiteGloveMetadata?.additionalCost || null,
      },
      pickup: {
        scheduled: !!pickupLog,
        date: pickupMetadata?.pickupDate || null,
        window: pickupMetadata?.pickupWindow || null,
        status: pickupLog ? 'SCHEDULED' : null,
      },
      delivery: {
        scheduled: !!deliveryLog,
        date: deliveryMetadata?.deliveryDate || null,
        window: deliveryMetadata?.deliveryWindow || null,
        status: deliveryLog ? 'SCHEDULED' : null,
      },
    };
  }

  /**
   * Verify that white glove service is active for a shipment.
   */
  private async verifyWhiteGloveActive(shipmentId: string): Promise<void> {
    const whiteGloveLog = await this.prisma.auditLog.findFirst({
      where: {
        entityType: 'Shipment',
        entityId: shipmentId,
        action: 'shipment.white_glove_requested',
      },
    });

    if (!whiteGloveLog) {
      throw new BadRequestException(
        'White glove service has not been requested for this shipment. Please request white glove service first.',
      );
    }
  }

  /**
   * Determine handling type from special instructions.
   */
  private determineHandlingType(instructions: string): string {
    const lower = instructions.toLowerCase();

    if (
      lower.includes('fragile') ||
      lower.includes('glass') ||
      lower.includes('ceramic')
    ) {
      return 'FRAGILE';
    }

    if (
      lower.includes('climate') ||
      lower.includes('temperature') ||
      lower.includes('humidity')
    ) {
      return 'CLIMATE_CONTROLLED';
    }

    if (
      lower.includes('art') ||
      lower.includes('painting') ||
      lower.includes('sculpture')
    ) {
      return 'ART_HANDLING';
    }

    if (
      lower.includes('antique') ||
      lower.includes('vintage') ||
      lower.includes('rare')
    ) {
      return 'ANTIQUE_HANDLING';
    }

    if (
      lower.includes('heavy') ||
      lower.includes('oversized') ||
      lower.includes('large')
    ) {
      return 'OVERSIZED';
    }

    return 'STANDARD_WHITE_GLOVE';
  }

  /**
   * Assign a pickup window based on the requested date.
   */
  private assignPickupWindow(date: Date): string {
    const day = date.getDay();

    // Weekday morning windows preferred
    if (day >= 1 && day <= 5) {
      return '09:00 - 12:00';
    }

    // Saturday afternoon
    if (day === 6) {
      return '10:00 - 14:00';
    }

    // Sunday (limited)
    return '11:00 - 15:00';
  }

  /**
   * Assign a delivery window based on the requested date.
   */
  private assignDeliveryWindow(date: Date): string {
    const day = date.getDay();

    // Weekdays
    if (day >= 1 && day <= 5) {
      return '10:00 - 14:00';
    }

    // Saturday
    if (day === 6) {
      return '10:00 - 16:00';
    }

    // Sunday
    return '12:00 - 16:00';
  }

  /**
   * Generate a unique white glove request ID.
   */
  private generateRequestId(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `WG-${timestamp}-${random}`;
  }
}
