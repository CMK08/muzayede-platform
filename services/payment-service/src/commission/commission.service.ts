import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

export interface CommissionBreakdown {
  buyerCommission: number;
  sellerCommission: number;
  buyerRate: number;
  sellerRate: number;
}

@Injectable()
export class CommissionService {
  private readonly logger = new Logger(CommissionService.name);
  private readonly DEFAULT_BUYER_RATE = 0.05;
  private readonly DEFAULT_SELLER_RATE = 0.10;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Calculate commission for a given seller and hammer price.
   * Checks for a custom commission rate on the SellerProfile first,
   * then falls back to tiered rates based on total sales volume.
   * Buyer commission is configurable via env (default 5%).
   */
  async calculate(
    sellerId: string,
    hammerPrice: number,
  ): Promise<CommissionBreakdown> {
    const sellerRate = await this.getSellerRate(sellerId);
    const buyerRate = this.configService.get<number>(
      'COMMISSION_BUYER_RATE',
      this.DEFAULT_BUYER_RATE,
    );

    const buyerCommission = Math.round(hammerPrice * buyerRate * 100) / 100;
    const sellerCommission = Math.round(hammerPrice * sellerRate * 100) / 100;

    this.logger.debug(
      `Commission calculated: hammerPrice=${hammerPrice}, buyerRate=${buyerRate}, sellerRate=${sellerRate}, buyerComm=${buyerCommission}, sellerComm=${sellerCommission}`,
    );

    return {
      buyerCommission,
      sellerCommission,
      buyerRate,
      sellerRate,
    };
  }

  /**
   * Determine seller commission rate:
   * 1. If SellerProfile has a custom commissionRate, use it.
   * 2. Otherwise, determine tier from total sales volume.
   */
  private async getSellerRate(sellerId: string): Promise<number> {
    const sellerProfile = await this.prisma.sellerProfile.findFirst({
      where: { userId: sellerId },
    });

    if (sellerProfile?.commissionRate) {
      return Number(sellerProfile.commissionRate);
    }

    const salesVolume = await this.getSellerSalesVolume(sellerId);

    if (salesVolume > 1_000_000) return 0.05; // Platinum: 5%
    if (salesVolume > 500_000) return 0.07;   // Gold: 7%
    if (salesVolume > 100_000) return 0.08;   // Silver: 8%
    return this.DEFAULT_SELLER_RATE;           // Standard: 10%
  }

  /**
   * Sum of hammerPrice on all COMPLETED orders where this user is the seller.
   */
  private async getSellerSalesVolume(sellerId: string): Promise<number> {
    const result = await this.prisma.order.aggregate({
      where: {
        sellerId,
        status: { in: ['COMPLETED', 'DELIVERED', 'PAID'] },
      },
      _sum: {
        hammerPrice: true,
      },
    });

    return result._sum.hammerPrice
      ? Number(result._sum.hammerPrice)
      : 0;
  }
}
