import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from '../common/dto/create-product.dto';
import { UpdateProductDto } from '../common/dto/update-product.dto';
import { QueryProductDto, ProductSortBy } from '../common/dto/query-product.dto';
import { turkishSlug } from '../common/utils/turkish-slug';
import { Prisma } from '@prisma/client';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProductDto, sellerId: string) {
    this.logger.log(`Creating product: ${dto.title} for seller: ${sellerId}`);

    const baseSlug = turkishSlug(dto.title);
    const slug = await this.ensureUniqueSlug(baseSlug);

    const product = await this.prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          title: dto.title,
          slug,
          shortDescription: dto.shortDescription,
          descriptionHtml: dto.descriptionHtml,
          categoryId: dto.categoryId,
          condition: (dto.condition as any) || 'USED',
          provenanceText: dto.provenanceText,
          certificateUrl: dto.certificateUrl,
          estimateLow: dto.estimateLow ? new Prisma.Decimal(dto.estimateLow) : null,
          estimateHigh: dto.estimateHigh ? new Prisma.Decimal(dto.estimateHigh) : null,
          sellerId,
          artistId: dto.artistId,
          attributes: dto.attributes && dto.attributes.length > 0
            ? {
                create: dto.attributes.map((attr) => ({
                  key: attr.key,
                  value: attr.value,
                })),
              }
            : undefined,
          media: dto.media && dto.media.length > 0
            ? {
                create: dto.media.map((m, index) => ({
                  type: (m.type as any) || 'IMAGE',
                  url: m.url,
                  thumbnailUrl: m.thumbnailUrl,
                  sortOrder: index,
                  isPrimary: index === 0,
                })),
              }
            : undefined,
        },
        include: {
          media: { orderBy: { sortOrder: 'asc' } },
          attributes: true,
          tags: { include: { tag: true } },
          category: true,
          seller: {
            select: {
              id: true,
              email: true,
              profile: {
                select: { firstName: true, lastName: true, displayName: true },
              },
            },
          },
          artist: true,
        },
      });

      if (dto.tags && dto.tags.length > 0) {
        for (const tagName of dto.tags) {
          const tagSlug = turkishSlug(tagName);
          const tag = await tx.tag.upsert({
            where: { slug: tagSlug },
            update: {},
            create: { name: tagName.trim(), slug: tagSlug },
          });

          await tx.productTag.create({
            data: {
              productId: created.id,
              tagId: tag.id,
            },
          });
        }
      }

      await tx.auditLog.create({
        data: {
          userId: sellerId,
          action: 'product.created',
          entityType: 'Product',
          entityId: created.id,
          metadata: { title: dto.title, slug },
        },
      });

      return created;
    });

    return this.findById(product.id);
  }

  async findAll(query: QueryProductDto) {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {};

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }
    if (query.sellerId) {
      where.sellerId = query.sellerId;
    }
    if (query.condition) {
      where.condition = query.condition as any;
    }
    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    } else {
      where.isActive = true;
    }
    if (query.priceMin !== undefined && !isNaN(Number(query.priceMin))) {
      where.estimateLow = { gte: new Prisma.Decimal(Number(query.priceMin)) };
    }
    if (query.priceMax !== undefined && !isNaN(Number(query.priceMax))) {
      where.estimateHigh = { lte: new Prisma.Decimal(Number(query.priceMax)) };
    }
    if (query.search) {
      where.title = { contains: query.search, mode: 'insensitive' };
    }

    let orderBy: Prisma.ProductOrderByWithRelationInput;
    switch (query.sort) {
      case ProductSortBy.OLDEST:
        orderBy = { createdAt: 'asc' };
        break;
      case ProductSortBy.PRICE_ASC:
        orderBy = { estimateLow: 'asc' };
        break;
      case ProductSortBy.PRICE_DESC:
        orderBy = { estimateHigh: 'desc' };
        break;
      case ProductSortBy.TITLE:
        orderBy = { title: 'asc' };
        break;
      case ProductSortBy.NEWEST:
      default:
        orderBy = { createdAt: 'desc' };
        break;
    }

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          media: {
            orderBy: { sortOrder: 'asc' },
            take: 3,
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
          _count: {
            select: { favorites: true },
          },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async findById(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        media: { orderBy: { sortOrder: 'asc' } },
        attributes: true,
        tags: { include: { tag: true } },
        category: true,
        seller: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
                displayName: true,
                bio: true,
                city: true,
                country: true,
              },
            },
            sellerProfile: {
              select: {
                storeName: true,
                storeSlug: true,
                logoUrl: true,
                performanceScore: true,
              },
            },
          },
        },
        artist: true,
        lots: {
          include: {
            auction: {
              select: {
                id: true,
                title: true,
                slug: true,
                status: true,
                startDate: true,
                endDate: true,
                type: true,
              },
            },
          },
        },
        _count: {
          select: { favorites: true },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return product;
  }

  async update(id: string, dto: UpdateProductDto, userId: string) {
    const existing = await this.prisma.product.findUnique({
      where: { id },
      include: { seller: { select: { id: true, role: true } } },
    });

    if (!existing) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
    if (existing.sellerId !== userId && !isAdmin) {
      throw new ForbiddenException('You are not authorized to update this product');
    }

    const updateData: Prisma.ProductUpdateInput = {};

    if (dto.title !== undefined) {
      updateData.title = dto.title;
      updateData.slug = await this.ensureUniqueSlug(turkishSlug(dto.title), id);
    }
    if (dto.shortDescription !== undefined) {
      updateData.shortDescription = dto.shortDescription;
    }
    if (dto.descriptionHtml !== undefined) {
      updateData.descriptionHtml = dto.descriptionHtml;
    }
    if (dto.categoryId !== undefined) {
      updateData.category = { connect: { id: dto.categoryId } };
    }
    if (dto.condition !== undefined) {
      updateData.condition = dto.condition as any;
    }
    if (dto.provenanceText !== undefined) {
      updateData.provenanceText = dto.provenanceText;
    }
    if (dto.certificateUrl !== undefined) {
      updateData.certificateUrl = dto.certificateUrl;
    }
    if (dto.estimateLow !== undefined) {
      updateData.estimateLow = new Prisma.Decimal(dto.estimateLow);
    }
    if (dto.estimateHigh !== undefined) {
      updateData.estimateHigh = new Prisma.Decimal(dto.estimateHigh);
    }
    if (dto.artistId !== undefined) {
      updateData.artist = { connect: { id: dto.artistId } };
    }
    if (dto.isActive !== undefined) {
      updateData.isActive = dto.isActive;
    }

    await this.prisma.$transaction(async (tx) => {
      if (dto.attributes !== undefined) {
        await tx.productAttribute.deleteMany({ where: { productId: id } });
        if (dto.attributes.length > 0) {
          await tx.productAttribute.createMany({
            data: dto.attributes.map((attr) => ({
              productId: id,
              key: attr.key,
              value: attr.value,
            })),
          });
        }
      }

      if (dto.tags !== undefined) {
        await tx.productTag.deleteMany({ where: { productId: id } });
        for (const tagName of dto.tags) {
          const tagSlug = turkishSlug(tagName);
          const tag = await tx.tag.upsert({
            where: { slug: tagSlug },
            update: {},
            create: { name: tagName.trim(), slug: tagSlug },
          });
          await tx.productTag.create({
            data: { productId: id, tagId: tag.id },
          });
        }
      }

      if (dto.mediaSortOrders && dto.mediaSortOrders.length > 0) {
        for (const sortItem of dto.mediaSortOrders) {
          await tx.productMedia.update({
            where: { id: sortItem.mediaId },
            data: { sortOrder: sortItem.sortOrder },
          });
        }
      }

      await tx.product.update({
        where: { id },
        data: updateData,
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'product.updated',
          entityType: 'Product',
          entityId: id,
          metadata: { updatedFields: Object.keys(dto) },
        },
      });
    });

    return this.findById(id);
  }

  async delete(id: string, userId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        lots: {
          include: {
            auction: { select: { status: true } },
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
    if (product.sellerId !== userId && !isAdmin) {
      throw new ForbiddenException('You are not authorized to delete this product');
    }

    const hasActiveLots = product.lots.some((lot) => {
      const activeStatuses = ['PUBLISHED', 'PRE_BID', 'LIVE'];
      return activeStatuses.includes(lot.auction.status);
    });

    if (hasActiveLots) {
      throw new ConflictException(
        'Cannot delete product that is referenced by an active auction lot',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id },
        data: { isActive: false },
      });

      await tx.auditLog.create({
        data: {
          userId,
          action: 'product.deleted',
          entityType: 'Product',
          entityId: id,
          metadata: { title: product.title, softDelete: true },
        },
      });
    });

    this.logger.log(`Product soft-deleted: ${id}`);
  }

  private async ensureUniqueSlug(baseSlug: string, excludeId?: string): Promise<string> {
    let slug = baseSlug;
    let counter = 0;

    while (true) {
      const existing = await this.prisma.product.findUnique({
        where: { slug },
        select: { id: true },
      });

      if (!existing || (excludeId && existing.id === excludeId)) {
        return slug;
      }

      counter++;
      slug = `${baseSlug}-${counter}`;
    }
  }
}
