import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LabelService {
  private readonly logger = new Logger(LabelService.name);
  private readonly s3Bucket: string;
  private readonly s3Region: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.s3Bucket = this.configService.get<string>(
      'AWS_S3_BUCKET',
      'muzayede-shipping-labels',
    );
    this.s3Region = this.configService.get<string>(
      'AWS_S3_REGION',
      'eu-central-1',
    );
  }

  /**
   * Generate a shipping label for a shipment.
   * Creates a label data structure, generates a unique filename,
   * and updates the shipment with the label URL.
   */
  async generateLabel(shipmentId: string) {
    this.logger.log(`Generating shipping label for shipment: ${shipmentId}`);

    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
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

    if (!shipment) {
      throw new NotFoundException(`Shipment ${shipmentId} not found`);
    }

    const order = shipment.order;
    const buyerProfile = order.buyer.profile;
    const sellerProfile = order.seller.profile;
    const sellerStore = order.seller.sellerProfile;

    const labelData = {
      trackingNumber: shipment.trackingNumber,
      barcode: this.generateBarcodeData(shipment.trackingNumber || ''),
      carrier: shipment.carrier,
      sender: {
        name: sellerStore?.storeName ||
          (sellerProfile
            ? `${sellerProfile.firstName} ${sellerProfile.lastName}`
            : order.seller.email),
        address: sellerProfile?.address || '',
        city: sellerProfile?.city || '',
        country: sellerProfile?.country || 'Turkey',
        postalCode: sellerProfile?.postalCode || '',
        phone: order.seller.phone || '',
      },
      recipient: {
        name: shipment.recipientName ||
          (buyerProfile
            ? `${buyerProfile.firstName} ${buyerProfile.lastName}`
            : order.buyer.email),
        address: shipment.deliveryAddress || buyerProfile?.address || '',
        city: buyerProfile?.city || '',
        country: buyerProfile?.country || 'Turkey',
        postalCode: buyerProfile?.postalCode || '',
        phone: order.buyer.phone || '',
      },
      package: {
        weight: shipment.weight ? `${Number(shipment.weight)} kg` : 'N/A',
        dimensions: shipment.dimensions || 'N/A',
        insuranceAmount: shipment.insuranceAmount
          ? `${Number(shipment.insuranceAmount)} ${order.currency}`
          : 'N/A',
      },
      orderNumber: order.orderNumber,
      auctionTitle: order.auction.title,
      createdAt: new Date().toISOString(),
    };

    const labelFileName = `labels/${new Date().getFullYear()}/${shipment.id}_${Date.now()}.pdf`;
    const labelUrl = `https://${this.s3Bucket}.s3.${this.s3Region}.amazonaws.com/${labelFileName}`;

    await this.prisma.$transaction(async (tx) => {
      await tx.shipment.update({
        where: { id: shipmentId },
        data: {
          labelUrl,
          status: shipment.status === 'PREPARING' ? 'LABEL_CREATED' : shipment.status,
        },
      });

      await tx.auditLog.create({
        data: {
          action: 'shipment.label_generated',
          entityType: 'Shipment',
          entityId: shipmentId,
          metadata: {
            orderId: order.id,
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
      labelData,
      status: 'LABEL_CREATED',
    };
  }

  /**
   * Generate barcode data string from tracking number.
   * This would normally encode the tracking number into a barcode format.
   */
  private generateBarcodeData(trackingNumber: string): string {
    const encoded = Buffer.from(trackingNumber).toString('base64');
    return `BARCODE:${encoded}`;
  }
}
