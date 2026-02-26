import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSellerProfileDto } from './dto/create-seller-profile.dto';
import { UpdateSellerProfileDto } from './dto/update-seller-profile.dto';

@Injectable()
export class SellerProfileService {
  private readonly logger = new Logger(SellerProfileService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a seller profile for a user.
   * Changes user role to SELLER (pending admin approval via isApproved flag).
   */
  async create(userId: string, dto: CreateSellerProfileDto) {
    this.logger.log(`Creating seller profile for user: ${userId}`);

    // Verify user exists
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Check if seller profile already exists
    const existingProfile = await this.prisma.sellerProfile.findUnique({
      where: { userId },
    });
    if (existingProfile) {
      throw new ConflictException(`User ${userId} already has a seller profile`);
    }

    // Check store slug uniqueness
    const slugExists = await this.prisma.sellerProfile.findUnique({
      where: { storeSlug: dto.storeSlug },
    });
    if (slugExists) {
      throw new ConflictException(`Store slug "${dto.storeSlug}" is already taken`);
    }

    // Use a transaction to create profile and update user role
    const [sellerProfile] = await this.prisma.$transaction([
      this.prisma.sellerProfile.create({
        data: {
          userId,
          storeName: dto.storeName,
          storeSlug: dto.storeSlug,
          companyName: dto.companyName,
          description: dto.description,
          logoUrl: dto.logoUrl,
          bannerUrl: dto.bannerUrl,
          website: dto.website,
          socialMedia: dto.socialMedia || undefined,
          bankIban: dto.bankIban,
          bankName: dto.bankName,
          taxId: dto.taxId,
          isApproved: false, // Requires admin approval
        },
      }),
      // Change user role to SELLER
      this.prisma.user.update({
        where: { id: userId },
        data: { role: 'SELLER' },
      }),
      // Audit log
      this.prisma.auditLog.create({
        data: {
          userId,
          action: 'seller_profile.created',
          entityType: 'SellerProfile',
          entityId: userId,
          metadata: {
            storeName: dto.storeName,
            storeSlug: dto.storeSlug,
          },
        },
      }),
    ]);

    return sellerProfile;
  }

  /**
   * Get seller profile with stats (total auctions, total sales, avg rating).
   */
  async findByUserId(userId: string) {
    this.logger.log(`Fetching seller profile for user: ${userId}`);

    const sellerProfile = await this.prisma.sellerProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            trustScore: true,
            isVerified: true,
            kycStatus: true,
            createdAt: true,
          },
        },
      },
    });

    if (!sellerProfile) {
      throw new NotFoundException(`Seller profile not found for user ${userId}`);
    }

    // Gather stats
    const [totalAuctions, totalSalesResult, completedOrders] = await Promise.all([
      // Total auctions created by this seller profile
      this.prisma.auction.count({
        where: { auctionHouseId: sellerProfile.id },
      }),
      // Total sales amount from completed seller orders
      this.prisma.order.aggregate({
        where: {
          sellerId: userId,
          status: 'COMPLETED',
        },
        _sum: { totalAmount: true },
        _count: true,
      }),
      // Completed orders count for rating calculation
      this.prisma.order.count({
        where: {
          sellerId: userId,
          status: { in: ['COMPLETED', 'DELIVERED'] },
        },
      }),
    ]);

    // Calculate average rating based on completion rate (simple metric)
    const totalSellerOrders = await this.prisma.order.count({
      where: { sellerId: userId },
    });

    const completionRate =
      totalSellerOrders > 0
        ? Math.round((completedOrders / totalSellerOrders) * 100)
        : 0;

    return {
      ...sellerProfile,
      stats: {
        totalAuctions,
        totalSales: totalSalesResult._count,
        totalSalesAmount: totalSalesResult._sum.totalAmount
          ? Number(totalSalesResult._sum.totalAmount)
          : 0,
        completionRate,
        performanceScore: sellerProfile.performanceScore,
      },
    };
  }

  /**
   * Update seller profile fields.
   */
  async update(userId: string, dto: UpdateSellerProfileDto) {
    this.logger.log(`Updating seller profile for user: ${userId}`);

    const existingProfile = await this.prisma.sellerProfile.findUnique({
      where: { userId },
    });

    if (!existingProfile) {
      throw new NotFoundException(`Seller profile not found for user ${userId}`);
    }

    const updateData: Record<string, unknown> = {};
    if (dto.storeName !== undefined) updateData.storeName = dto.storeName;
    if (dto.companyName !== undefined) updateData.companyName = dto.companyName;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.logoUrl !== undefined) updateData.logoUrl = dto.logoUrl;
    if (dto.bannerUrl !== undefined) updateData.bannerUrl = dto.bannerUrl;
    if (dto.website !== undefined) updateData.website = dto.website;
    if (dto.socialMedia !== undefined) updateData.socialMedia = dto.socialMedia;
    if (dto.bankIban !== undefined) updateData.bankIban = dto.bankIban;
    if (dto.bankName !== undefined) updateData.bankName = dto.bankName;
    if (dto.taxId !== undefined) updateData.taxId = dto.taxId;

    const updatedProfile = await this.prisma.sellerProfile.update({
      where: { userId },
      data: updateData,
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'seller_profile.updated',
        entityType: 'SellerProfile',
        entityId: existingProfile.id,
        metadata: {
          updatedFields: Object.keys(dto).filter(
            (key) => dto[key as keyof UpdateSellerProfileDto] !== undefined,
          ),
        },
      },
    });

    return updatedProfile;
  }
}
