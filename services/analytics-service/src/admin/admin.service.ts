import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getRecentAuctions(limit: number) {
    return this.prisma.auction.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        type: true,
        status: true,
        startPrice: true,
        currentPrice: true,
        bidCount: true,
        startDate: true,
        endDate: true,
        createdAt: true,
      },
    });
  }

  async getRecentOrders(limit: number) {
    return this.prisma.order.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        totalAmount: true,
        hammerPrice: true,
        status: true,
        createdAt: true,
        buyer: {
          select: {
            id: true,
            email: true,
            profile: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });
  }

  async getUsers(
    page: number,
    limit: number,
    filters: { search?: string; role?: string; status?: string },
  ) {
    const where: any = {};

    if (filters.search) {
      where.OR = [
        { email: { contains: filters.search, mode: 'insensitive' } },
        { profile: { firstName: { contains: filters.search, mode: 'insensitive' } } },
        { profile: { lastName: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }
    if (filters.role) {
      where.role = filters.role;
    }
    if (filters.status) {
      where.isActive = filters.status === 'active';
    }

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          phone: true,
          role: true,
          isActive: true,
          isVerified: true,
          kycStatus: true,
          trustScore: true,
          createdAt: true,
          lastLoginAt: true,
          avatarUrl: true,
          profile: {
            select: {
              firstName: true,
              lastName: true,
              displayName: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getAuctions(
    page: number,
    limit: number,
    filters: { search?: string; status?: string; type?: string },
  ) {
    const where: any = {};

    if (filters.search) {
      where.title = { contains: filters.search, mode: 'insensitive' };
    }
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.type) {
      where.type = filters.type;
    }

    const [data, total] = await Promise.all([
      this.prisma.auction.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          type: true,
          status: true,
          startPrice: true,
          currentPrice: true,
          reservePrice: true,
          reserveMet: true,
          bidCount: true,
          startDate: true,
          endDate: true,
          actualEndDate: true,
          buyerCommissionRate: true,
          sellerCommissionRate: true,
          createdAt: true,
          createdBy: true,
          _count: { select: { lots: true } },
        },
      }),
      this.prisma.auction.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getProducts(
    page: number,
    limit: number,
    filters: { search?: string; category?: string },
  ) {
    const where: any = {};

    if (filters.search) {
      where.title = { contains: filters.search, mode: 'insensitive' };
    }
    if (filters.category) {
      where.categoryId = filters.category;
    }

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          shortDescription: true,
          condition: true,
          estimateLow: true,
          estimateHigh: true,
          createdAt: true,
          category: { select: { id: true, name: true } },
          seller: {
            select: {
              id: true,
              email: true,
              profile: { select: { firstName: true, lastName: true } },
            },
          },
          media: {
            where: { isPrimary: true },
            take: 1,
            select: { url: true },
          },
          _count: { select: { lots: true } },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getOrders(
    page: number,
    limit: number,
    filters: { status?: string; search?: string },
  ) {
    const where: any = {};

    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.search) {
      where.OR = [
        { id: { contains: filters.search, mode: 'insensitive' } },
        { buyer: { email: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          hammerPrice: true,
          buyerCommission: true,
          sellerCommission: true,
          vatAmount: true,
          totalAmount: true,
          status: true,
          createdAt: true,
          buyer: {
            select: {
              id: true,
              email: true,
              profile: { select: { firstName: true, lastName: true } },
            },
          },
          seller: {
            select: {
              id: true,
              email: true,
              sellerProfile: { select: { storeName: true } },
            },
          },
          auction: {
            select: { id: true, title: true },
          },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getCommissionSummary(period: string) {
    const { start, end } = this.getDateRange(period);

    const result = await this.prisma.order.aggregate({
      where: {
        status: 'COMPLETED',
        createdAt: { gte: start, lte: end },
      },
      _sum: {
        buyerCommission: true,
        sellerCommission: true,
      },
      _count: true,
    });

    return {
      totalBuyerCommission: Number(result._sum.buyerCommission || 0),
      totalSellerCommission: Number(result._sum.sellerCommission || 0),
      totalCommission:
        Number(result._sum.buyerCommission || 0) +
        Number(result._sum.sellerCommission || 0),
      orderCount: result._count,
    };
  }

  async getPayoutSummary(period: string) {
    const { start, end } = this.getDateRange(period);

    const [completed, pending] = await Promise.all([
      this.prisma.sellerPayout.aggregate({
        where: {
          status: 'COMPLETED',
          paidAt: { gte: start, lte: end },
        },
        _sum: { netAmount: true },
        _count: true,
      }),
      this.prisma.sellerPayout.aggregate({
        where: { status: 'PENDING' },
        _sum: { netAmount: true },
        _count: true,
      }),
    ]);

    return {
      completedPayouts: Number(completed._sum.netAmount || 0),
      completedCount: completed._count,
      pendingPayouts: Number(pending._sum.netAmount || 0),
      pendingCount: pending._count,
    };
  }

  async getCmsOverview() {
    try {
      const [pages, banners, blogPosts, faqs] = await Promise.all([
        this.prisma.page.count(),
        this.prisma.banner.count(),
        this.prisma.blogPost.count(),
        this.prisma.faq.count(),
      ]);

      return { pages, banners, blogPosts, faqs };
    } catch {
      return { pages: 0, banners: 0, blogPosts: 0, faqs: 0 };
    }
  }

  async getSettings() {
    try {
      const settings = await this.prisma.platformSetting.findMany();
      const settingsMap: Record<string, any> = {};
      for (const s of settings) {
        settingsMap[s.key] = s.value;
      }
      return settingsMap;
    } catch {
      return {
        siteName: 'Müzayede Platform',
        defaultCurrency: 'TRY',
        defaultLanguage: 'tr',
        buyerCommissionRate: 15,
        sellerCommissionRate: 10,
        antiSnipeMinutes: 5,
        antiSnipeExtension: 3,
        maintenanceMode: false,
      };
    }
  }

  async updateSettings(payload: Record<string, unknown>) {
    const entries = Object.entries(payload);
    for (const [key, value] of entries) {
      try {
        await this.prisma.platformSetting.upsert({
          where: { key },
          create: { key, value: JSON.stringify(value) },
          update: { value: JSON.stringify(value) },
        });
      } catch {
        this.logger.warn(`Could not update setting: ${key}`);
      }
    }
    return this.getSettings();
  }

  private getDateRange(period: string): { start: Date; end: Date } {
    const now = new Date();
    const end = new Date(now);
    let start: Date;

    switch (period) {
      case 'day':
      case '24h':
        start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
      case '7d':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
      case '1y':
        start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    return { start, end };
  }
}
