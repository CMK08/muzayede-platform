import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

// ----------------------------------------------------------------
// Interfaces
// ----------------------------------------------------------------

export interface CommissionBreakdown {
  buyerCommission: number;
  sellerCommission: number;
  buyerRate: number;
  sellerRate: number;
}

export interface CommissionRates {
  buyerRate: number;
  sellerRate: number;
  source: 'custom' | 'tiered' | 'default';
  tier?: string;
  salesVolume?: number;
}

// ----------------------------------------------------------------
// Service
// ----------------------------------------------------------------

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
   * Calculate commission for a given auction and hammer price.
   * Uses auction-level rates if available, otherwise falls back to
   * seller-specific or default rates.
   */
  async calculateCommission(
    auctionId: string,
    hammerPrice: number,
  ): Promise<CommissionBreakdown & { auctionId: string; hammerPrice: number }> {
    this.logger.log(
      `Calculating commission: auctionId=${auctionId}, hammerPrice=${hammerPrice}`,
    );

    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
    });

    let buyerRate = this.configService.get<number>(
      'COMMISSION_BUYER_RATE',
      this.DEFAULT_BUYER_RATE,
    );
    let sellerRate = this.DEFAULT_SELLER_RATE;

    if (auction) {
      if (auction.buyerCommissionRate && Number(auction.buyerCommissionRate) > 0) {
        buyerRate = Number(auction.buyerCommissionRate);
      }
      if (auction.sellerCommissionRate && Number(auction.sellerCommissionRate) > 0) {
        sellerRate = Number(auction.sellerCommissionRate);
      } else if (auction.createdBy) {
        sellerRate = await this.getSellerRate(auction.createdBy);
      }
    }

    const buyerCommission = Math.round(hammerPrice * buyerRate * 100) / 100;
    const sellerCommission = Math.round(hammerPrice * sellerRate * 100) / 100;

    this.logger.debug(
      `Commission: buyerRate=${buyerRate}, sellerRate=${sellerRate}, buyerComm=${buyerCommission}, sellerComm=${sellerCommission}`,
    );

    return {
      auctionId,
      hammerPrice,
      buyerCommission,
      sellerCommission,
      buyerRate,
      sellerRate,
    };
  }

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
   * Get commission rates for a given auction or seller.
   * If auctionId is provided, returns auction-level rates.
   * If sellerId is provided, returns seller-level rates with tier info.
   * Otherwise returns global defaults.
   */
  async getCommissionRates(
    auctionId?: string,
    sellerId?: string,
  ): Promise<CommissionRates> {
    this.logger.log(
      `Getting commission rates: auctionId=${auctionId}, sellerId=${sellerId}`,
    );

    const buyerRate = this.configService.get<number>(
      'COMMISSION_BUYER_RATE',
      this.DEFAULT_BUYER_RATE,
    );

    // If auction-specific rates exist, use them
    if (auctionId) {
      const auction = await this.prisma.auction.findUnique({
        where: { id: auctionId },
      });

      if (auction) {
        const auctionBuyerRate = Number(auction.buyerCommissionRate);
        const auctionSellerRate = Number(auction.sellerCommissionRate);

        if (auctionBuyerRate > 0 || auctionSellerRate > 0) {
          return {
            buyerRate: auctionBuyerRate > 0 ? auctionBuyerRate : buyerRate,
            sellerRate:
              auctionSellerRate > 0
                ? auctionSellerRate
                : this.DEFAULT_SELLER_RATE,
            source: 'custom',
          };
        }
      }
    }

    // If seller-specific rates exist, use them with tier info
    if (sellerId) {
      const sellerProfile = await this.prisma.sellerProfile.findFirst({
        where: { userId: sellerId },
      });

      if (sellerProfile?.commissionRate) {
        return {
          buyerRate,
          sellerRate: Number(sellerProfile.commissionRate),
          source: 'custom',
        };
      }

      const salesVolume = await this.getSellerSalesVolume(sellerId);
      const { rate, tier } = this.getTieredRate(salesVolume);

      return {
        buyerRate,
        sellerRate: rate,
        source: salesVolume > 0 ? 'tiered' : 'default',
        tier,
        salesVolume,
      };
    }

    // Global defaults
    return {
      buyerRate,
      sellerRate: this.DEFAULT_SELLER_RATE,
      source: 'default',
    };
  }

  /**
   * Set a custom commission rate for a seller or auction.
   */
  async setCommissionRate(
    targetId: string,
    type: 'seller' | 'auction',
    rate: number,
  ): Promise<{ targetId: string; type: string; rate: number; updated: boolean }> {
    this.logger.log(
      `Setting commission rate: targetId=${targetId}, type=${type}, rate=${rate}`,
    );

    if (type === 'seller') {
      const sellerProfile = await this.prisma.sellerProfile.findFirst({
        where: { userId: targetId },
      });

      if (!sellerProfile) {
        throw new NotFoundException(
          `Seller profile not found for user ${targetId}`,
        );
      }

      await this.prisma.sellerProfile.update({
        where: { id: sellerProfile.id },
        data: { commissionRate: rate },
      });

      await this.prisma.auditLog.create({
        data: {
          action: 'commission.rate_updated',
          entityType: 'SellerProfile',
          entityId: sellerProfile.id,
          metadata: {
            type: 'seller',
            targetId,
            oldRate: sellerProfile.commissionRate
              ? Number(sellerProfile.commissionRate)
              : null,
            newRate: rate,
          },
        },
      });

      return { targetId, type, rate, updated: true };
    }

    if (type === 'auction') {
      const auction = await this.prisma.auction.findUnique({
        where: { id: targetId },
      });

      if (!auction) {
        throw new NotFoundException(`Auction ${targetId} not found`);
      }

      await this.prisma.auction.update({
        where: { id: targetId },
        data: { sellerCommissionRate: rate },
      });

      await this.prisma.auditLog.create({
        data: {
          action: 'commission.rate_updated',
          entityType: 'Auction',
          entityId: targetId,
          metadata: {
            type: 'auction',
            targetId,
            oldRate: Number(auction.sellerCommissionRate),
            newRate: rate,
          },
        },
      });

      return { targetId, type, rate, updated: true };
    }

    return { targetId, type, rate, updated: false };
  }

  // ----------------------------------------------------------------
  // Private helpers
  // ----------------------------------------------------------------

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
    const { rate } = this.getTieredRate(salesVolume);

    return rate;
  }

  /**
   * Get tiered rate based on sales volume.
   */
  private getTieredRate(salesVolume: number): { rate: number; tier: string } {
    if (salesVolume > 1_000_000) return { rate: 0.05, tier: 'Platinum' };
    if (salesVolume > 500_000) return { rate: 0.07, tier: 'Gold' };
    if (salesVolume > 100_000) return { rate: 0.08, tier: 'Silver' };
    return { rate: this.DEFAULT_SELLER_RATE, tier: 'Standard' };
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

    return result._sum.hammerPrice ? Number(result._sum.hammerPrice) : 0;
  }
}
