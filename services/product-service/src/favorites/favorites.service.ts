import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FavoritesService {
  private readonly logger = new Logger(FavoritesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async addFavorite(productId: string, userId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, isActive: true },
    });

    if (!product || !product.isActive) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    const existing = await this.prisma.favorite.findUnique({
      where: {
        userId_productId: { userId, productId },
      },
    });

    if (existing) {
      throw new ConflictException('Product is already in your favorites');
    }

    const favorite = await this.prisma.favorite.create({
      data: {
        userId,
        productId,
      },
      include: {
        product: {
          select: {
            id: true,
            title: true,
            slug: true,
            estimateLow: true,
            estimateHigh: true,
            media: {
              orderBy: { sortOrder: 'asc' },
              take: 1,
              select: { url: true, thumbnailUrl: true },
            },
          },
        },
      },
    });

    this.logger.log(`User ${userId} favorited product ${productId}`);
    return favorite;
  }

  async removeFavorite(productId: string, userId: string) {
    const existing = await this.prisma.favorite.findUnique({
      where: {
        userId_productId: { userId, productId },
      },
    });

    if (!existing) {
      throw new NotFoundException('Favorite not found');
    }

    await this.prisma.favorite.delete({
      where: {
        userId_productId: { userId, productId },
      },
    });

    this.logger.log(`User ${userId} removed favorite for product ${productId}`);
  }

  async getUserFavorites(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.favorite.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          product: {
            select: {
              id: true,
              title: true,
              slug: true,
              shortDescription: true,
              condition: true,
              estimateLow: true,
              estimateHigh: true,
              isActive: true,
              media: {
                orderBy: { sortOrder: 'asc' },
                take: 1,
                select: { id: true, url: true, thumbnailUrl: true },
              },
              category: {
                select: { id: true, name: true, slug: true },
              },
              seller: {
                select: {
                  id: true,
                  profile: {
                    select: { firstName: true, lastName: true, displayName: true },
                  },
                },
              },
              artist: {
                select: { id: true, name: true },
              },
              _count: {
                select: { favorites: true },
              },
            },
          },
        },
      }),
      this.prisma.favorite.count({ where: { userId } }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async isFavorited(productId: string, userId: string): Promise<boolean> {
    const favorite = await this.prisma.favorite.findUnique({
      where: {
        userId_productId: { userId, productId },
      },
      select: { id: true },
    });
    return !!favorite;
  }
}
