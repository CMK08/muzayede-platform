import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ReportResult {
  reportId: string;
  type: string;
  period: { from: string; to: string };
  generatedAt: string;
  data: Record<string, any>;
  summary: Record<string, any>;
}

@Injectable()
export class ReportService {
  private readonly logger = new Logger(ReportService.name);

  constructor(private readonly prisma: PrismaService) {}

  async generateReport(type: string, from: Date, to: Date): Promise<ReportResult> {
    this.logger.log(
      `Generating report: type=${type}, from=${from.toISOString()}, to=${to.toISOString()}`,
    );

    if (from >= to) {
      throw new BadRequestException('"from" date must be before "to" date');
    }

    const reportId = `rpt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    let data: Record<string, any> = {};
    let summary: Record<string, any> = {};

    switch (type) {
      case 'revenue':
        ({ data, summary } = await this.generateRevenueReport(from, to));
        break;
      case 'auctions':
        ({ data, summary } = await this.generateAuctionsReport(from, to));
        break;
      case 'users':
        ({ data, summary } = await this.generateUsersReport(from, to));
        break;
      case 'commissions':
        ({ data, summary } = await this.generateCommissionsReport(from, to));
        break;
      case 'sales':
        ({ data, summary } = await this.generateSalesReport(from, to));
        break;
      default:
        throw new BadRequestException(`Unknown report type: ${type}`);
    }

    return {
      reportId,
      type,
      period: { from: from.toISOString(), to: to.toISOString() },
      generatedAt: new Date().toISOString(),
      data,
      summary,
    };
  }

  async getAuctionPerformance(auctionId: string) {
    this.logger.log(`Getting auction performance: ${auctionId}`);

    const auction = await this.prisma.auction.findUnique({
      where: { id: auctionId },
      include: {
        bids: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            userId: true,
            amount: true,
            createdAt: true,
            type: true,
          },
        },
      },
    });

    if (!auction) {
      throw new NotFoundException(`Auction with ID ${auctionId} not found`);
    }

    const totalBids = auction.bids.length;
    const uniqueBidders = new Set(auction.bids.map((b) => b.userId)).size;
    const finalPrice = Number(auction.currentPrice || auction.startPrice);

    const priceProgression = auction.bids.map((bid) => ({
      amount: Number(bid.amount),
      time: bid.createdAt,
      type: bid.type,
    }));

    const timeToFirstBid =
      totalBids > 0
        ? (auction.bids[0].createdAt.getTime() - auction.startDate.getTime()) / 1000
        : null;

    let biddingVelocity = 0;
    if (totalBids > 1) {
      const firstBidTime = auction.bids[0].createdAt.getTime();
      const lastBidTime = auction.bids[totalBids - 1].createdAt.getTime();
      const durationMinutes = (lastBidTime - firstBidTime) / (1000 * 60);
      biddingVelocity = durationMinutes > 0 ? totalBids / durationMinutes : totalBids;
    }

    const durationHours = auction.actualEndDate
      ? (auction.actualEndDate.getTime() - auction.startDate.getTime()) / (1000 * 60 * 60)
      : (auction.endDate.getTime() - auction.startDate.getTime()) / (1000 * 60 * 60);

    return {
      auctionId,
      title: auction.title,
      type: auction.type,
      status: auction.status,
      totalBids,
      uniqueBidders,
      finalPrice,
      startPrice: Number(auction.startPrice),
      priceIncrease: finalPrice - Number(auction.startPrice),
      priceIncreasePercent:
        Number(auction.startPrice) > 0
          ? Math.round(
              ((finalPrice - Number(auction.startPrice)) / Number(auction.startPrice)) * 10000,
            ) / 100
          : 0,
      reserveMet: auction.reserveMet,
      priceProgression,
      timeToFirstBidSeconds: timeToFirstBid,
      biddingVelocityPerMinute: Math.round(biddingVelocity * 100) / 100,
      durationHours: Math.round(durationHours * 100) / 100,
    };
  }

  private async generateRevenueReport(from: Date, to: Date) {
    const orders = await this.prisma.order.findMany({
      where: {
        status: 'COMPLETED',
        createdAt: { gte: from, lte: to },
      },
      include: {
        auction: {
          include: {
            lots: {
              include: {
                product: {
                  include: { category: true },
                },
              },
            },
          },
        },
        seller: {
          include: {
            profile: true,
            sellerProfile: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const dailyRevenue = new Map<string, number>();
    const revenueByCategory = new Map<string, number>();
    const revenueBySeller = new Map<string, { name: string; revenue: number }>();

    for (const order of orders) {
      const dateKey = order.createdAt.toISOString().split('T')[0];
      dailyRevenue.set(dateKey, (dailyRevenue.get(dateKey) || 0) + Number(order.totalAmount));

      for (const lot of order.auction.lots) {
        const catName = lot.product.category?.name || 'Kategorisiz';
        revenueByCategory.set(
          catName,
          (revenueByCategory.get(catName) || 0) + Number(order.hammerPrice),
        );
      }

      const sellerName =
        order.seller.sellerProfile?.storeName ||
        order.seller.profile?.displayName ||
        order.seller.email;
      const sellerEntry = revenueBySeller.get(order.sellerId) || {
        name: sellerName,
        revenue: 0,
      };
      sellerEntry.revenue += Number(order.totalAmount);
      revenueBySeller.set(order.sellerId, sellerEntry);
    }

    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
    const totalCommissions = orders.reduce(
      (sum, o) => sum + Number(o.buyerCommission) + Number(o.sellerCommission),
      0,
    );

    return {
      data: {
        dailyRevenue: Array.from(dailyRevenue.entries()).map(([date, amount]) => ({
          date,
          amount: Math.round(amount * 100) / 100,
        })),
        revenueByCategory: Array.from(revenueByCategory.entries())
          .map(([category, amount]) => ({
            category,
            amount: Math.round(amount * 100) / 100,
          }))
          .sort((a, b) => b.amount - a.amount),
        revenueBySeller: Array.from(revenueBySeller.entries())
          .map(([sellerId, entry]) => ({
            sellerId,
            name: entry.name,
            revenue: Math.round(entry.revenue * 100) / 100,
          }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 20),
      },
      summary: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalCommissions: Math.round(totalCommissions * 100) / 100,
        totalOrders: orders.length,
        averageOrderValue:
          orders.length > 0
            ? Math.round((totalRevenue / orders.length) * 100) / 100
            : 0,
      },
    };
  }

  private async generateAuctionsReport(from: Date, to: Date) {
    const auctions = await this.prisma.auction.findMany({
      where: { createdAt: { gte: from, lte: to } },
      include: {
        bids: true,
      },
    });

    const completed = auctions.filter((a) => a.status === 'COMPLETED');
    const cancelled = auctions.filter((a) => a.status === 'CANCELLED');

    const completionRate =
      auctions.length > 0 ? (completed.length / auctions.length) * 100 : 0;

    const avgBidsPerAuction =
      auctions.length > 0
        ? auctions.reduce((sum, a) => sum + a.bids.length, 0) / auctions.length
        : 0;

    const avgDuration =
      completed.length > 0
        ? completed.reduce((sum, a) => {
            const endTime = a.actualEndDate || a.endDate;
            return sum + (endTime.getTime() - a.startDate.getTime()) / (1000 * 60 * 60);
          }, 0) / completed.length
        : 0;

    const auctionsByType = new Map<string, number>();
    const auctionsByStatus = new Map<string, number>();

    for (const auction of auctions) {
      auctionsByType.set(auction.type, (auctionsByType.get(auction.type) || 0) + 1);
      auctionsByStatus.set(auction.status, (auctionsByStatus.get(auction.status) || 0) + 1);
    }

    const bidDistribution = [0, 0, 0, 0, 0];
    for (const auction of auctions) {
      const count = auction.bids.length;
      if (count === 0) bidDistribution[0]++;
      else if (count <= 5) bidDistribution[1]++;
      else if (count <= 20) bidDistribution[2]++;
      else if (count <= 50) bidDistribution[3]++;
      else bidDistribution[4]++;
    }

    return {
      data: {
        auctionsByType: Array.from(auctionsByType.entries()).map(([type, count]) => ({
          type,
          count,
        })),
        auctionsByStatus: Array.from(auctionsByStatus.entries()).map(([status, count]) => ({
          status,
          count,
        })),
        bidDistribution: [
          { range: '0 bids', count: bidDistribution[0] },
          { range: '1-5 bids', count: bidDistribution[1] },
          { range: '6-20 bids', count: bidDistribution[2] },
          { range: '21-50 bids', count: bidDistribution[3] },
          { range: '50+ bids', count: bidDistribution[4] },
        ],
      },
      summary: {
        totalAuctions: auctions.length,
        completedAuctions: completed.length,
        cancelledAuctions: cancelled.length,
        completionRate: Math.round(completionRate * 100) / 100,
        averageBidsPerAuction: Math.round(avgBidsPerAuction * 100) / 100,
        averageDurationHours: Math.round(avgDuration * 100) / 100,
      },
    };
  }

  private async generateUsersReport(from: Date, to: Date) {
    const [
      newRegistrations,
      totalUsersAtEnd,
      activeUserBids,
      activeUserOrders,
    ] = await Promise.all([
      this.prisma.user.findMany({
        where: { createdAt: { gte: from, lte: to } },
        select: { id: true, createdAt: true, role: true },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.user.count({ where: { createdAt: { lte: to } } }),
      this.prisma.bid.findMany({
        where: { createdAt: { gte: from, lte: to } },
        select: { userId: true },
        distinct: ['userId'],
      }),
      this.prisma.order.findMany({
        where: { createdAt: { gte: from, lte: to } },
        select: { buyerId: true },
        distinct: ['buyerId'],
      }),
    ]);

    const activeUserIds = new Set([
      ...activeUserBids.map((b) => b.userId),
      ...activeUserOrders.map((o) => o.buyerId),
    ]);

    const dailyRegistrations = new Map<string, number>();
    for (const user of newRegistrations) {
      const dateKey = user.createdAt.toISOString().split('T')[0];
      dailyRegistrations.set(dateKey, (dailyRegistrations.get(dateKey) || 0) + 1);
    }

    return {
      data: {
        registrations: Array.from(dailyRegistrations.entries()).map(([date, count]) => ({
          date,
          count,
        })),
        roleDistribution: {
          buyer: newRegistrations.filter((u) => u.role === 'BUYER').length,
          seller: newRegistrations.filter((u) => u.role === 'SELLER').length,
          auctionHouse: newRegistrations.filter((u) => u.role === 'AUCTION_HOUSE').length,
        },
      },
      summary: {
        newRegistrations: newRegistrations.length,
        totalUsers: totalUsersAtEnd,
        activeUsers: activeUserIds.size,
        activityRate:
          totalUsersAtEnd > 0
            ? Math.round((activeUserIds.size / totalUsersAtEnd) * 10000) / 100
            : 0,
      },
    };
  }

  private async generateCommissionsReport(from: Date, to: Date) {
    const orders = await this.prisma.order.findMany({
      where: {
        status: 'COMPLETED',
        createdAt: { gte: from, lte: to },
      },
      include: {
        seller: {
          include: { sellerProfile: true },
        },
      },
    });

    const commissionBySeller = new Map<
      string,
      {
        sellerId: string;
        storeName: string;
        buyerCommissions: number;
        sellerCommissions: number;
        totalCommissions: number;
        orderCount: number;
      }
    >();

    let totalBuyerCommissions = 0;
    let totalSellerCommissions = 0;

    for (const order of orders) {
      const buyerComm = Number(order.buyerCommission);
      const sellerComm = Number(order.sellerCommission);
      totalBuyerCommissions += buyerComm;
      totalSellerCommissions += sellerComm;

      const storeName = order.seller.sellerProfile?.storeName || order.sellerId;
      const entry = commissionBySeller.get(order.sellerId) || {
        sellerId: order.sellerId,
        storeName,
        buyerCommissions: 0,
        sellerCommissions: 0,
        totalCommissions: 0,
        orderCount: 0,
      };
      entry.buyerCommissions += buyerComm;
      entry.sellerCommissions += sellerComm;
      entry.totalCommissions += buyerComm + sellerComm;
      entry.orderCount += 1;
      commissionBySeller.set(order.sellerId, entry);
    }

    return {
      data: {
        commissionBySeller: Array.from(commissionBySeller.values())
          .map((entry) => ({
            ...entry,
            buyerCommissions: Math.round(entry.buyerCommissions * 100) / 100,
            sellerCommissions: Math.round(entry.sellerCommissions * 100) / 100,
            totalCommissions: Math.round(entry.totalCommissions * 100) / 100,
          }))
          .sort((a, b) => b.totalCommissions - a.totalCommissions),
        commissionByType: {
          buyerCommissions: Math.round(totalBuyerCommissions * 100) / 100,
          sellerCommissions: Math.round(totalSellerCommissions * 100) / 100,
        },
      },
      summary: {
        totalCommissions: Math.round((totalBuyerCommissions + totalSellerCommissions) * 100) / 100,
        totalBuyerCommissions: Math.round(totalBuyerCommissions * 100) / 100,
        totalSellerCommissions: Math.round(totalSellerCommissions * 100) / 100,
        averageCommissionPerOrder:
          orders.length > 0
            ? Math.round(
                ((totalBuyerCommissions + totalSellerCommissions) / orders.length) * 100,
              ) / 100
            : 0,
        totalOrders: orders.length,
      },
    };
  }

  private async generateSalesReport(from: Date, to: Date) {
    const orders = await this.prisma.order.findMany({
      where: {
        status: 'COMPLETED',
        createdAt: { gte: from, lte: to },
      },
      include: {
        auction: {
          include: {
            lots: {
              include: {
                product: {
                  include: {
                    category: true,
                    media: { where: { isPrimary: true }, take: 1 },
                  },
                },
              },
            },
          },
        },
        seller: {
          include: { sellerProfile: true, profile: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const dailySales = new Map<string, { count: number; total: number }>();
    const topProducts: Array<{
      productTitle: string;
      category: string;
      hammerPrice: number;
      imageUrl: string | null;
    }> = [];

    for (const order of orders) {
      const dateKey = order.createdAt.toISOString().split('T')[0];
      const existing = dailySales.get(dateKey) || { count: 0, total: 0 };
      existing.count += 1;
      existing.total += Number(order.totalAmount);
      dailySales.set(dateKey, existing);

      for (const lot of order.auction.lots) {
        if (lot.status === 'sold') {
          topProducts.push({
            productTitle: lot.product.title,
            category: lot.product.category?.name || 'Kategorisiz',
            hammerPrice: Number(lot.hammerPrice || 0),
            imageUrl: lot.product.media[0]?.url || null,
          });
        }
      }
    }

    topProducts.sort((a, b) => b.hammerPrice - a.hammerPrice);

    const totalSales = orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);

    const categoryRevenue = new Map<string, number>();
    for (const item of topProducts) {
      categoryRevenue.set(
        item.category,
        (categoryRevenue.get(item.category) || 0) + item.hammerPrice,
      );
    }

    return {
      data: {
        dailySales: Array.from(dailySales.entries()).map(([date, stats]) => ({
          date,
          count: stats.count,
          total: Math.round(stats.total * 100) / 100,
        })),
        topProducts: topProducts.slice(0, 20).map((p) => ({
          ...p,
          hammerPrice: Math.round(p.hammerPrice * 100) / 100,
        })),
        topCategories: Array.from(categoryRevenue.entries())
          .map(([category, revenue]) => ({
            category,
            revenue: Math.round(revenue * 100) / 100,
          }))
          .sort((a, b) => b.revenue - a.revenue),
      },
      summary: {
        totalSales: Math.round(totalSales * 100) / 100,
        totalTransactions: orders.length,
        averageOrderValue:
          orders.length > 0
            ? Math.round((totalSales / orders.length) * 100) / 100
            : 0,
        topCategory:
          topProducts.length > 0 ? topProducts[0].category : '',
      },
    };
  }
}
