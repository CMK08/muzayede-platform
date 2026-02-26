import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  private getDateRange(period: string): { start: Date; end: Date; prevStart: Date; prevEnd: Date } {
    const now = new Date();
    const end = new Date(now);
    let start: Date;
    let prevStart: Date;
    let prevEnd: Date;

    switch (period) {
      case 'day':
      case '24h':
        start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        prevEnd = new Date(start);
        prevStart = new Date(start.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
      case '7d':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        prevEnd = new Date(start);
        prevStart = new Date(start.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
      case '30d':
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        prevEnd = new Date(start);
        prevStart = new Date(start.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
      case '1y':
      case '90d':
        const days = period === '90d' ? 90 : 365;
        start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        prevEnd = new Date(start);
        prevStart = new Date(start.getTime() - days * 24 * 60 * 60 * 1000);
        break;
      default:
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        prevEnd = new Date(start);
        prevStart = new Date(start.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    return { start, end, prevStart, prevEnd };
  }

  private calcPercentChange(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 10000) / 100;
  }

  async getDashboardMetrics(period: string) {
    this.logger.log(`Getting dashboard metrics for period: ${period}`);

    const { start, end, prevStart, prevEnd } = this.getDateRange(period);

    const [
      currentRevenue,
      previousRevenue,
      currentAuctions,
      previousAuctions,
      currentUsers,
      previousUsers,
      currentBids,
      previousBids,
      activeAuctions,
      currentOrders,
      previousOrders,
      newUsers,
      previousNewUsers,
    ] = await Promise.all([
      this.prisma.order.aggregate({
        where: { status: 'COMPLETED', createdAt: { gte: start, lte: end } },
        _sum: { totalAmount: true },
      }),
      this.prisma.order.aggregate({
        where: { status: 'COMPLETED', createdAt: { gte: prevStart, lte: prevEnd } },
        _sum: { totalAmount: true },
      }),
      this.prisma.auction.count({
        where: { createdAt: { gte: start, lte: end } },
      }),
      this.prisma.auction.count({
        where: { createdAt: { gte: prevStart, lte: prevEnd } },
      }),
      this.prisma.user.count({
        where: { createdAt: { lte: end } },
      }),
      this.prisma.user.count({
        where: { createdAt: { lte: prevEnd } },
      }),
      this.prisma.bid.count({
        where: { createdAt: { gte: start, lte: end } },
      }),
      this.prisma.bid.count({
        where: { createdAt: { gte: prevStart, lte: prevEnd } },
      }),
      this.prisma.auction.count({
        where: { status: 'LIVE' },
      }),
      this.prisma.order.count({
        where: { createdAt: { gte: start, lte: end } },
      }),
      this.prisma.order.count({
        where: { createdAt: { gte: prevStart, lte: prevEnd } },
      }),
      this.prisma.user.count({
        where: { createdAt: { gte: start, lte: end } },
      }),
      this.prisma.user.count({
        where: { createdAt: { gte: prevStart, lte: prevEnd } },
      }),
    ]);

    const totalRevenue = Number(currentRevenue._sum.totalAmount || 0);
    const prevTotalRevenue = Number(previousRevenue._sum.totalAmount || 0);
    const conversionRate = currentBids > 0 ? (currentOrders / currentBids) * 100 : 0;
    const prevConversionRate = previousBids > 0 ? (previousOrders / previousBids) * 100 : 0;
    const avgHammerPrice = currentOrders > 0 ? totalRevenue / currentOrders : 0;

    return {
      period,
      overview: {
        totalRevenue: {
          value: totalRevenue,
          change: this.calcPercentChange(totalRevenue, prevTotalRevenue),
        },
        totalAuctions: {
          value: currentAuctions,
          change: this.calcPercentChange(currentAuctions, previousAuctions),
        },
        totalUsers: {
          value: currentUsers,
          change: this.calcPercentChange(currentUsers, previousUsers),
        },
        newUsers: {
          value: newUsers,
          change: this.calcPercentChange(newUsers, previousNewUsers),
        },
        totalBids: {
          value: currentBids,
          change: this.calcPercentChange(currentBids, previousBids),
        },
        activeAuctions: {
          value: activeAuctions,
        },
        conversionRate: {
          value: Math.round(conversionRate * 100) / 100,
          change: this.calcPercentChange(conversionRate, prevConversionRate),
        },
        averageHammerPrice: {
          value: Math.round(avgHammerPrice * 100) / 100,
        },
      },
    };
  }

  async getRevenueChart(
    period: string,
    granularity: 'day' | 'week' | 'month' = 'day',
  ) {
    this.logger.log(`Getting revenue chart: period=${period}, granularity=${granularity}`);

    const { start, end } = this.getDateRange(period);

    const orders = await this.prisma.order.findMany({
      where: {
        status: 'COMPLETED',
        createdAt: { gte: start, lte: end },
      },
      select: {
        totalAmount: true,
        buyerCommission: true,
        sellerCommission: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const buckets = new Map<string, { revenue: number; commissionEarned: number }>();

    for (const order of orders) {
      let key: string;
      const date = order.createdAt;

      switch (granularity) {
        case 'day':
          key = date.toISOString().split('T')[0];
          break;
        case 'week': {
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0];
          break;
        }
        case 'month':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        default:
          key = date.toISOString().split('T')[0];
      }

      const existing = buckets.get(key) || { revenue: 0, commissionEarned: 0 };
      existing.revenue += Number(order.totalAmount);
      existing.commissionEarned +=
        Number(order.buyerCommission) + Number(order.sellerCommission);
      buckets.set(key, existing);
    }

    const chart = Array.from(buckets.entries()).map(([date, data]) => ({
      date,
      revenue: Math.round(data.revenue * 100) / 100,
      commissionEarned: Math.round(data.commissionEarned * 100) / 100,
    }));

    return { period, granularity, data: chart };
  }

  async getCategoryPerformance(period: string) {
    this.logger.log(`Getting category performance: period=${period}`);

    const { start, end } = this.getDateRange(period);

    const completedLots = await this.prisma.auctionLot.findMany({
      where: {
        status: 'sold',
        auction: {
          status: 'COMPLETED',
          actualEndDate: { gte: start, lte: end },
        },
      },
      include: {
        product: {
          include: { category: true },
        },
        auction: {
          include: { bids: true },
        },
      },
    });

    const categoryMap = new Map<
      string,
      {
        categoryName: string;
        auctionCount: number;
        totalRevenue: number;
        bidCount: number;
        auctionIds: Set<string>;
      }
    >();

    for (const lot of completedLots) {
      const categoryName = lot.product.category?.name || 'Kategorisiz';
      const existing = categoryMap.get(categoryName) || {
        categoryName,
        auctionCount: 0,
        totalRevenue: 0,
        bidCount: 0,
        auctionIds: new Set<string>(),
      };

      existing.totalRevenue += Number(lot.hammerPrice || 0);
      existing.bidCount += lot.auction.bids.length;

      if (!existing.auctionIds.has(lot.auctionId)) {
        existing.auctionIds.add(lot.auctionId);
        existing.auctionCount += 1;
      }

      categoryMap.set(categoryName, existing);
    }

    const categories = Array.from(categoryMap.values()).map((cat) => ({
      categoryName: cat.categoryName,
      auctionCount: cat.auctionCount,
      totalRevenue: Math.round(cat.totalRevenue * 100) / 100,
      avgHammerPrice:
        cat.auctionCount > 0
          ? Math.round((cat.totalRevenue / cat.auctionCount) * 100) / 100
          : 0,
      bidCount: cat.bidCount,
    }));

    categories.sort((a, b) => b.totalRevenue - a.totalRevenue);

    return { period, categories };
  }

  async getTopSellers(period: string, limit = 10) {
    this.logger.log(`Getting top sellers: period=${period}, limit=${limit}`);

    const { start, end } = this.getDateRange(period);

    const sellerOrders = await this.prisma.order.findMany({
      where: {
        status: 'COMPLETED',
        createdAt: { gte: start, lte: end },
      },
      select: {
        sellerId: true,
        totalAmount: true,
        seller: {
          select: {
            id: true,
            email: true,
            profile: {
              select: { firstName: true, lastName: true, displayName: true },
            },
            sellerProfile: {
              select: { storeName: true, performanceScore: true },
            },
          },
        },
      },
    });

    const sellerMap = new Map<
      string,
      {
        sellerId: string;
        sellerName: string;
        storeName: string;
        totalSales: number;
        auctionCount: number;
        avgRating: number;
      }
    >();

    for (const order of sellerOrders) {
      const existing = sellerMap.get(order.sellerId) || {
        sellerId: order.sellerId,
        sellerName:
          order.seller.profile?.displayName ||
          `${order.seller.profile?.firstName || ''} ${order.seller.profile?.lastName || ''}`.trim() ||
          order.seller.email,
        storeName: order.seller.sellerProfile?.storeName || '',
        totalSales: 0,
        auctionCount: 0,
        avgRating: order.seller.sellerProfile?.performanceScore || 0,
      };

      existing.totalSales += Number(order.totalAmount);
      existing.auctionCount += 1;
      sellerMap.set(order.sellerId, existing);
    }

    const sellers = Array.from(sellerMap.values())
      .sort((a, b) => b.totalSales - a.totalSales)
      .slice(0, limit)
      .map((s) => ({
        ...s,
        totalSales: Math.round(s.totalSales * 100) / 100,
      }));

    return { period, limit, sellers };
  }

  async getTopBuyers(period: string, limit = 10) {
    this.logger.log(`Getting top buyers: period=${period}, limit=${limit}`);

    const { start, end } = this.getDateRange(period);

    const [buyerOrders, buyerBids] = await Promise.all([
      this.prisma.order.findMany({
        where: {
          status: 'COMPLETED',
          createdAt: { gte: start, lte: end },
        },
        select: {
          buyerId: true,
          totalAmount: true,
          buyer: {
            select: {
              id: true,
              email: true,
              profile: {
                select: { firstName: true, lastName: true, displayName: true },
              },
            },
          },
        },
      }),
      this.prisma.bid.findMany({
        where: {
          createdAt: { gte: start, lte: end },
        },
        select: {
          userId: true,
          isWinning: true,
        },
      }),
    ]);

    const bidMap = new Map<string, { total: number; winning: number }>();
    for (const bid of buyerBids) {
      const existing = bidMap.get(bid.userId) || { total: 0, winning: 0 };
      existing.total += 1;
      if (bid.isWinning) existing.winning += 1;
      bidMap.set(bid.userId, existing);
    }

    const buyerMap = new Map<
      string,
      {
        buyerId: string;
        buyerName: string;
        totalSpend: number;
        orderCount: number;
        bidCount: number;
        winRate: number;
      }
    >();

    for (const order of buyerOrders) {
      const existing = buyerMap.get(order.buyerId) || {
        buyerId: order.buyerId,
        buyerName:
          order.buyer.profile?.displayName ||
          `${order.buyer.profile?.firstName || ''} ${order.buyer.profile?.lastName || ''}`.trim() ||
          order.buyer.email,
        totalSpend: 0,
        orderCount: 0,
        bidCount: 0,
        winRate: 0,
      };

      existing.totalSpend += Number(order.totalAmount);
      existing.orderCount += 1;
      buyerMap.set(order.buyerId, existing);
    }

    for (const [buyerId, entry] of buyerMap.entries()) {
      const bidStats = bidMap.get(buyerId);
      if (bidStats) {
        entry.bidCount = bidStats.total;
        entry.winRate =
          bidStats.total > 0
            ? Math.round((bidStats.winning / bidStats.total) * 10000) / 100
            : 0;
      }
    }

    const buyers = Array.from(buyerMap.values())
      .sort((a, b) => b.totalSpend - a.totalSpend)
      .slice(0, limit)
      .map((b) => ({
        ...b,
        totalSpend: Math.round(b.totalSpend * 100) / 100,
      }));

    return { period, limit, buyers };
  }

  async getAuctionAnalytics(period: string, categoryId?: string) {
    this.logger.log(`Getting auction analytics: period=${period}, category=${categoryId}`);

    const { start, end } = this.getDateRange(period);

    const whereClause: any = {
      createdAt: { gte: start, lte: end },
    };

    const [totalAuctions, completedAuctions, cancelledAuctions, liveAuctions, bidsInPeriod] =
      await Promise.all([
        this.prisma.auction.count({ where: whereClause }),
        this.prisma.auction.count({ where: { ...whereClause, status: 'COMPLETED' } }),
        this.prisma.auction.count({ where: { ...whereClause, status: 'CANCELLED' } }),
        this.prisma.auction.count({ where: { status: 'LIVE' } }),
        this.prisma.bid.count({ where: { createdAt: { gte: start, lte: end } } }),
      ]);

    const completedAuctionDetails = await this.prisma.auction.findMany({
      where: { ...whereClause, status: 'COMPLETED' },
      select: {
        currentPrice: true,
        startPrice: true,
        reserveMet: true,
        startDate: true,
        actualEndDate: true,
        endDate: true,
        bidCount: true,
        type: true,
      },
    });

    const avgBidsPerAuction =
      completedAuctionDetails.length > 0
        ? completedAuctionDetails.reduce((sum, a) => sum + a.bidCount, 0) /
          completedAuctionDetails.length
        : 0;

    const avgSellingPrice =
      completedAuctionDetails.length > 0
        ? completedAuctionDetails.reduce((sum, a) => sum + Number(a.currentPrice || 0), 0) /
          completedAuctionDetails.length
        : 0;

    const sellThroughRate =
      totalAuctions > 0 ? (completedAuctions / totalAuctions) * 100 : 0;

    const reserveMetCount = completedAuctionDetails.filter((a) => a.reserveMet).length;
    const reserveMetRate =
      completedAuctionDetails.length > 0
        ? (reserveMetCount / completedAuctionDetails.length) * 100
        : 0;

    const durations = completedAuctionDetails
      .filter((a) => a.actualEndDate || a.endDate)
      .map((a) => {
        const endTime = a.actualEndDate || a.endDate;
        return (endTime.getTime() - a.startDate.getTime()) / (1000 * 60 * 60);
      });
    const avgDuration =
      durations.length > 0
        ? durations.reduce((sum, d) => sum + d, 0) / durations.length
        : 0;

    const byType: Record<string, { count: number; avgPrice: number; totalPrice: number }> = {};
    for (const a of completedAuctionDetails) {
      const typeKey = a.type.toLowerCase();
      if (!byType[typeKey]) {
        byType[typeKey] = { count: 0, avgPrice: 0, totalPrice: 0 };
      }
      byType[typeKey].count += 1;
      byType[typeKey].totalPrice += Number(a.currentPrice || 0);
    }
    for (const key of Object.keys(byType)) {
      byType[key].avgPrice =
        byType[key].count > 0
          ? Math.round((byType[key].totalPrice / byType[key].count) * 100) / 100
          : 0;
    }

    return {
      period,
      categoryId,
      metrics: {
        totalAuctions,
        completedAuctions,
        cancelledAuctions,
        liveAuctions,
        totalBids: bidsInPeriod,
        averageBidsPerAuction: Math.round(avgBidsPerAuction * 100) / 100,
        averageSellingPrice: Math.round(avgSellingPrice * 100) / 100,
        sellThroughRate: Math.round(sellThroughRate * 100) / 100,
        reserveMetRate: Math.round(reserveMetRate * 100) / 100,
        averageDurationHours: Math.round(avgDuration * 100) / 100,
      },
      byType,
    };
  }

  async getRevenueAnalytics(period: string) {
    this.logger.log(`Getting revenue analytics: period=${period}`);

    const { start, end } = this.getDateRange(period);

    const orders = await this.prisma.order.findMany({
      where: {
        status: 'COMPLETED',
        createdAt: { gte: start, lte: end },
      },
      select: {
        totalAmount: true,
        buyerCommission: true,
        sellerCommission: true,
        hammerPrice: true,
      },
    });

    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
    const totalCommissions = orders.reduce(
      (sum, o) => sum + Number(o.buyerCommission) + Number(o.sellerCommission),
      0,
    );
    const gmv = orders.reduce((sum, o) => sum + Number(o.hammerPrice), 0);

    const payouts = await this.prisma.sellerPayout.aggregate({
      where: {
        status: 'COMPLETED',
        paidAt: { gte: start, lte: end },
      },
      _sum: { netAmount: true },
    });

    const payoutsToSellers = Number(payouts._sum.netAmount || 0);
    const avgCommissionRate = gmv > 0 ? (totalCommissions / gmv) * 100 : 0;

    return {
      period,
      revenue: {
        total: Math.round(totalRevenue * 100) / 100,
        commissions: Math.round(totalCommissions * 100) / 100,
        gmv: Math.round(gmv * 100) / 100,
      },
      averageCommissionRate: Math.round(avgCommissionRate * 100) / 100,
      payoutsToSellers: Math.round(payoutsToSellers * 100) / 100,
    };
  }

  async getUserAnalytics(period: string) {
    this.logger.log(`Getting user analytics: period=${period}`);

    const { start, end, prevStart, prevEnd } = this.getDateRange(period);

    const [totalUsers, newUsers, prevNewUsers, activeUsersWithBids, activeUsersWithOrders] =
      await Promise.all([
        this.prisma.user.count({ where: { createdAt: { lte: end } } }),
        this.prisma.user.count({ where: { createdAt: { gte: start, lte: end } } }),
        this.prisma.user.count({ where: { createdAt: { gte: prevStart, lte: prevEnd } } }),
        this.prisma.bid.findMany({
          where: { createdAt: { gte: start, lte: end } },
          select: { userId: true },
          distinct: ['userId'],
        }),
        this.prisma.order.findMany({
          where: { createdAt: { gte: start, lte: end } },
          select: { buyerId: true },
          distinct: ['buyerId'],
        }),
      ]);

    const activeUserIds = new Set([
      ...activeUsersWithBids.map((b) => b.userId),
      ...activeUsersWithOrders.map((o) => o.buyerId),
    ]);

    const returningUsers = await this.prisma.user.count({
      where: {
        createdAt: { lt: start },
        lastLoginAt: { gte: start, lte: end },
      },
    });

    const churnRate =
      totalUsers > 0 ? ((totalUsers - activeUserIds.size) / totalUsers) * 100 : 0;

    return {
      period,
      users: {
        total: totalUsers,
        active: activeUserIds.size,
        new: newUsers,
        newChange: this.calcPercentChange(newUsers, prevNewUsers),
        returning: returningUsers,
        churnRate: Math.round(churnRate * 100) / 100,
      },
    };
  }

  async trackEvent(
    eventType: string,
    userId: string | undefined,
    properties: Record<string, any>,
  ) {
    this.logger.debug(`Tracking event: ${eventType}, user=${userId}`);

    const auditLog = await this.prisma.auditLog.create({
      data: {
        userId: userId || null,
        action: eventType,
        entityType: properties.entityType || null,
        entityId: properties.entityId || null,
        metadata: {
          page: properties.page || null,
          referrer: properties.referrer || null,
          device: properties.device || null,
          ...properties,
        },
        ipAddress: properties.ipAddress || null,
        userAgent: properties.userAgent || null,
      },
    });

    return {
      eventId: auditLog.id,
      eventType,
      userId,
      properties,
      timestamp: auditLog.createdAt.toISOString(),
    };
  }

  async getUserActivity(userId: string, period: string) {
    this.logger.log(`Getting user activity: userId=${userId}, period=${period}`);

    const { start, end } = this.getDateRange(period);

    const logs = await this.prisma.auditLog.findMany({
      where: {
        userId,
        createdAt: { gte: start, lte: end },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    const activityByAction = new Map<string, number>();
    for (const log of logs) {
      const count = activityByAction.get(log.action) || 0;
      activityByAction.set(log.action, count + 1);
    }

    return {
      userId,
      period,
      totalEvents: logs.length,
      activitySummary: Object.fromEntries(activityByAction),
      recentEvents: logs.slice(0, 20).map((log) => ({
        id: log.id,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        metadata: log.metadata,
        createdAt: log.createdAt,
      })),
    };
  }
}
