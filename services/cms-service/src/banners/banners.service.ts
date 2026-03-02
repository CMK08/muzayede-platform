import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BannersService {
  private readonly logger = new Logger(BannersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(query?: {
    position?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }) {
    this.logger.log(`Listing banners: ${JSON.stringify(query || {})}`);

    const page = query?.page || 1;
    const limit = query?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query?.position) {
      where.position = query.position;
    }

    if (query?.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    const [banners, total] = await Promise.all([
      this.prisma.banner.findMany({
        where,
        orderBy: { sortOrder: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.banner.count({ where }),
    ]);

    return {
      data: banners,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    this.logger.log(`Getting banner: ${id}`);

    const banner = await this.prisma.banner.findUnique({ where: { id } });
    if (!banner) {
      throw new NotFoundException(`Banner with ID '${id}' not found`);
    }

    return banner;
  }

  async create(dto: {
    title: string;
    imageUrl: string;
    mobileImageUrl?: string;
    linkUrl?: string;
    position?: string;
    sortOrder?: number;
    isActive?: boolean;
    startDate?: string;
    endDate?: string;
  }) {
    this.logger.log(`Creating banner: ${dto.title}`);

    return this.prisma.banner.create({
      data: {
        title: dto.title,
        imageUrl: dto.imageUrl,
        mobileImageUrl: dto.mobileImageUrl || null,
        linkUrl: dto.linkUrl || null,
        position: dto.position || 'home_hero',
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
      },
    });
  }

  async update(
    id: string,
    dto: {
      title?: string;
      imageUrl?: string;
      mobileImageUrl?: string;
      linkUrl?: string;
      position?: string;
      sortOrder?: number;
      isActive?: boolean;
      startDate?: string;
      endDate?: string;
    },
  ) {
    this.logger.log(`Updating banner: ${id}`);

    const banner = await this.prisma.banner.findUnique({ where: { id } });
    if (!banner) {
      throw new NotFoundException(`Banner with ID '${id}' not found`);
    }

    return this.prisma.banner.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
        ...(dto.mobileImageUrl !== undefined && { mobileImageUrl: dto.mobileImageUrl }),
        ...(dto.linkUrl !== undefined && { linkUrl: dto.linkUrl }),
        ...(dto.position !== undefined && { position: dto.position }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.startDate !== undefined && {
          startDate: dto.startDate ? new Date(dto.startDate) : null,
        }),
        ...(dto.endDate !== undefined && {
          endDate: dto.endDate ? new Date(dto.endDate) : null,
        }),
      },
    });
  }

  async delete(id: string) {
    this.logger.log(`Deleting banner: ${id}`);

    const banner = await this.prisma.banner.findUnique({ where: { id } });
    if (!banner) {
      throw new NotFoundException(`Banner with ID '${id}' not found`);
    }

    await this.prisma.banner.delete({ where: { id } });
    return { deleted: true };
  }

  async reorder(bannerIds: string[]) {
    this.logger.log(`Reordering ${bannerIds.length} banners`);

    const updates = bannerIds.map((id, index) =>
      this.prisma.banner.update({
        where: { id },
        data: { sortOrder: index },
      }),
    );

    await this.prisma.$transaction(updates);
    return { reordered: true, count: bannerIds.length };
  }

  async getActiveBanners(position: string) {
    this.logger.log(`Getting active banners for position: ${position}`);

    const now = new Date();

    return this.prisma.banner.findMany({
      where: {
        position,
        isActive: true,
        OR: [
          {
            startDate: null,
            endDate: null,
          },
          {
            startDate: { lte: now },
            endDate: null,
          },
          {
            startDate: null,
            endDate: { gte: now },
          },
          {
            startDate: { lte: now },
            endDate: { gte: now },
          },
        ],
      },
      orderBy: { sortOrder: 'asc' },
    });
  }
}
