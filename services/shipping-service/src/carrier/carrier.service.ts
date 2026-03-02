import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { ShippingService } from '../shipping/shipping.service';

export interface Dimensions {
  length: number;
  width: number;
  height: number;
}

export interface ShippingRate {
  carrier: string;
  carrierCode: string;
  serviceName: string;
  estimatedDays: number;
  price: number;
  currency: string;
  insuranceAvailable: boolean;
  whiteGloveAvailable: boolean;
}

export interface CarrierInfo {
  code: string;
  name: string;
  description: string;
  services: string[];
  maxWeight: number;
  trackingUrlTemplate: string;
  supportsInsurance: boolean;
  supportsWhiteGlove: boolean;
}

export interface PackageRateRequest {
  weight: number;
  dimensions: Dimensions;
  declaredValue?: number;
}

@Injectable()
export class CarrierService {
  private readonly logger = new Logger(CarrierService.name);

  private readonly carriers: CarrierInfo[] = [
    {
      code: 'UPS',
      name: 'UPS',
      description: 'United Parcel Service - Reliable international shipping',
      services: ['Ground', 'Express', '2-Day Air', 'Next Day Air'],
      maxWeight: 70,
      trackingUrlTemplate: 'https://www.ups.com/track?tracknum={tracking}',
      supportsInsurance: true,
      supportsWhiteGlove: false,
    },
    {
      code: 'DHL',
      name: 'DHL Express',
      description: 'DHL Express - Global express shipping',
      services: ['Express Worldwide', 'Economy Select', 'Express Easy'],
      maxWeight: 50,
      trackingUrlTemplate: 'https://www.dhl.com/en/express/tracking.html?AWB={tracking}',
      supportsInsurance: true,
      supportsWhiteGlove: false,
    },
    {
      code: 'WHITE_GLOVE',
      name: 'White Glove Delivery',
      description: 'Premium handling for high-value and fragile auction items',
      services: ['Standard White Glove', 'Premium White Glove', 'Climate Controlled'],
      maxWeight: 500,
      trackingUrlTemplate: 'https://www.muzayede.com/kargo/takip/{tracking}',
      supportsInsurance: true,
      supportsWhiteGlove: true,
    },
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly shippingService: ShippingService,
  ) {}

  /**
   * Calculate shipping rate for a specific carrier.
   */
  calculateRate(
    weight: number,
    dimensions: Dimensions,
    origin: string,
    destination: string,
    carrier: string,
  ): ShippingRate {
    this.logger.log(
      `Calculating rate: ${carrier} from ${origin} to ${destination}, weight=${weight}kg`,
    );

    const carrierInfo = this.carriers.find((c) => c.code === carrier);
    if (!carrierInfo) {
      throw new NotFoundException(`Carrier ${carrier} not found`);
    }

    const volumetricWeight =
      (dimensions.length * dimensions.width * dimensions.height) / 5000;
    const chargeableWeight = Math.max(weight, volumetricWeight);

    let basePrice: number;
    let estimatedDays: number;
    const isInternational = this.isInternational(origin, destination);

    switch (carrier) {
      case 'UPS':
        basePrice = isInternational
          ? 45 + chargeableWeight * 12
          : 25 + chargeableWeight * 7;
        estimatedDays = isInternational ? 5 : 3;
        break;
      case 'DHL':
        basePrice = isInternational
          ? 50 + chargeableWeight * 11
          : 30 + chargeableWeight * 8;
        estimatedDays = isInternational ? 4 : 3;
        break;
      case 'WHITE_GLOVE':
        basePrice = isInternational
          ? 150 + chargeableWeight * 20
          : 100 + chargeableWeight * 15;
        estimatedDays = isInternational ? 7 : 5;
        break;
      default:
        basePrice = 35 + chargeableWeight * 8;
        estimatedDays = 4;
    }

    // Distance surcharge (simplified)
    const distanceFactor = isInternational ? 1.5 : 1.0;
    const finalPrice = Math.round(basePrice * distanceFactor * 100) / 100;

    return {
      carrier: carrierInfo.name,
      carrierCode: carrierInfo.code,
      serviceName: carrierInfo.services[0],
      estimatedDays,
      price: finalPrice,
      currency: 'USD',
      insuranceAvailable: carrierInfo.supportsInsurance,
      whiteGloveAvailable: carrierInfo.supportsWhiteGlove,
    };
  }

  /**
   * Generate a shipping label for a shipment.
   * Returns a label URL (simulated S3 storage).
   */
  async generateLabel(shipmentId: string): Promise<{
    shipmentId: string;
    trackingNumber: string | null;
    labelUrl: string;
    carrier: string;
    generatedAt: string;
  }> {
    this.logger.log(`Generating label for shipment: ${shipmentId}`);

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

    const s3Bucket = this.configService.get<string>(
      'AWS_S3_BUCKET',
      'muzayede-shipping-labels',
    );
    const s3Region = this.configService.get<string>(
      'AWS_S3_REGION',
      'eu-central-1',
    );

    const labelFileName = `labels/${new Date().getFullYear()}/${shipment.id}_${Date.now()}.pdf`;
    const labelUrl = `https://${s3Bucket}.s3.${s3Region}.amazonaws.com/${labelFileName}`;

    await this.prisma.$transaction(async (tx) => {
      await tx.shipment.update({
        where: { id: shipmentId },
        data: {
          labelUrl,
          status:
            shipment.status === 'PREPARING'
              ? ('LABEL_CREATED' as any)
              : shipment.status,
        },
      });

      await tx.auditLog.create({
        data: {
          action: 'shipment.label_generated',
          entityType: 'Shipment',
          entityId: shipmentId,
          metadata: {
            orderId: shipment.orderId,
            trackingNumber: shipment.trackingNumber,
            labelUrl,
            carrier: shipment.carrier,
          },
        },
      });
    });

    this.logger.log(`Label generated for shipment ${shipmentId}: ${labelUrl}`);

    return {
      shipmentId,
      trackingNumber: shipment.trackingNumber,
      labelUrl,
      carrier: shipment.carrier,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Get all available carriers with their details.
   */
  getAllCarriers(): CarrierInfo[] {
    return this.carriers;
  }

  /**
   * Get rate quotes from all carriers for a given package.
   */
  getCarrierRates(
    packageInfo: PackageRateRequest,
    origin: string,
    destination: string,
  ): ShippingRate[] {
    this.logger.log(
      `Getting all carrier rates: ${origin} -> ${destination}, weight=${packageInfo.weight}kg`,
    );

    const rates: ShippingRate[] = [];

    for (const carrier of this.carriers) {
      try {
        if (packageInfo.weight <= carrier.maxWeight) {
          const rate = this.calculateRate(
            packageInfo.weight,
            packageInfo.dimensions,
            origin,
            destination,
            carrier.code,
          );
          rates.push(rate);
        }
      } catch (error) {
        this.logger.warn(
          `Failed to get rate from ${carrier.code}: ${error}`,
        );
      }
    }

    return rates.sort((a, b) => a.price - b.price);
  }

  /**
   * Check if shipping is international (simplified).
   */
  private isInternational(origin: string, destination: string): boolean {
    const originCountry = origin.split(',').pop()?.trim().toLowerCase() || '';
    const destCountry = destination.split(',').pop()?.trim().toLowerCase() || '';
    return originCountry !== destCountry && originCountry !== '' && destCountry !== '';
  }
}
