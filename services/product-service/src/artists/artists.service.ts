import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateArtistDto, UpdateArtistDto, QueryArtistDto } from '../common/dto/create-artist.dto';
import { turkishSlug } from '../common/utils/turkish-slug';
import { Prisma } from '@prisma/client';

@Injectable()
export class ArtistsService {
  private readonly logger = new Logger(ArtistsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryArtistDto) {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.ArtistWhereInput = {
      isActive: true,
    };

    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }

    const [data, total] = await Promise.all([
      this.prisma.artist.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          _count: {
            select: { products: true, exhibitions: true },
          },
        },
      }),
      this.prisma.artist.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string) {
    const artist = await this.prisma.artist.findUnique({
      where: { id },
      include: {
        products: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
          include: {
            media: {
              orderBy: { sortOrder: 'asc' },
              take: 1,
              select: { id: true, url: true, thumbnailUrl: true },
            },
            category: { select: { id: true, name: true, slug: true } },
            _count: { select: { favorites: true } },
          },
        },
        exhibitions: {
          include: {
            exhibition: {
              select: {
                id: true,
                title: true,
                slug: true,
                coverImage: true,
                startDate: true,
                endDate: true,
                isActive: true,
              },
            },
          },
        },
        _count: {
          select: { products: true, exhibitions: true },
        },
      },
    });

    if (!artist) {
      throw new NotFoundException(`Artist with ID ${id} not found`);
    }

    return artist;
  }

  async create(dto: CreateArtistDto) {
    this.logger.log(`Creating artist: ${dto.name}`);

    const baseSlug = turkishSlug(dto.name);
    const slug = await this.ensureUniqueSlug(baseSlug);

    const artist = await this.prisma.artist.create({
      data: {
        name: dto.name,
        slug,
        biography: dto.biography,
        photoUrl: dto.photoUrl,
        birthYear: dto.birthYear,
        deathYear: dto.deathYear,
        nationality: dto.nationality,
      },
      include: {
        _count: { select: { products: true, exhibitions: true } },
      },
    });

    return artist;
  }

  async update(id: string, dto: UpdateArtistDto) {
    const existing = await this.prisma.artist.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException(`Artist with ID ${id} not found`);
    }

    const updateData: Prisma.ArtistUpdateInput = {};

    if (dto.name !== undefined) {
      updateData.name = dto.name;
      updateData.slug = await this.ensureUniqueSlug(turkishSlug(dto.name), id);
    }
    if (dto.biography !== undefined) updateData.biography = dto.biography;
    if (dto.photoUrl !== undefined) updateData.photoUrl = dto.photoUrl;
    if (dto.birthYear !== undefined) updateData.birthYear = dto.birthYear;
    if (dto.deathYear !== undefined) updateData.deathYear = dto.deathYear;
    if (dto.nationality !== undefined) updateData.nationality = dto.nationality;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    const artist = await this.prisma.artist.update({
      where: { id },
      data: updateData,
      include: {
        _count: { select: { products: true, exhibitions: true } },
      },
    });

    return artist;
  }

  async calculatePriceIndex(artistId: string) {
    const artist = await this.prisma.artist.findUnique({
      where: { id: artistId },
      select: { id: true, name: true, priceIndex: true },
    });

    if (!artist) {
      throw new NotFoundException(`Artist with ID ${artistId} not found`);
    }

    const completedLots = await this.prisma.auctionLot.findMany({
      where: {
        product: { artistId },
        status: 'sold',
        hammerPrice: { not: null },
      },
      include: {
        product: {
          select: { estimateLow: true, estimateHigh: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (completedLots.length === 0) {
      return {
        artistId,
        artistName: artist.name,
        priceIndex: artist.priceIndex,
        totalSales: 0,
        averageHammerPrice: null,
        averageEstimateMidpoint: null,
        indexRatio: null,
        message: 'No completed sales found for price index calculation',
      };
    }

    let totalHammerPrice = 0;
    let totalEstimateMid = 0;
    let validComparisons = 0;

    for (const lot of completedLots) {
      const hammer = lot.hammerPrice ? Number(lot.hammerPrice) : 0;
      totalHammerPrice += hammer;

      const estLow = lot.product.estimateLow ? Number(lot.product.estimateLow) : 0;
      const estHigh = lot.product.estimateHigh ? Number(lot.product.estimateHigh) : 0;

      if (estLow > 0 && estHigh > 0) {
        const midpoint = (estLow + estHigh) / 2;
        totalEstimateMid += midpoint;
        validComparisons++;
      }
    }

    const averageHammerPrice = totalHammerPrice / completedLots.length;

    let indexRatio: number | null = null;
    let averageEstimateMidpoint: number | null = null;

    if (validComparisons > 0) {
      averageEstimateMidpoint = totalEstimateMid / validComparisons;
      indexRatio = averageHammerPrice / averageEstimateMidpoint;
    }

    const priceIndex = indexRatio ? Math.round(indexRatio * 100) : artist.priceIndex;

    await this.prisma.artist.update({
      where: { id: artistId },
      data: { priceIndex },
    });

    return {
      artistId,
      artistName: artist.name,
      priceIndex,
      totalSales: completedLots.length,
      averageHammerPrice: Math.round(averageHammerPrice * 100) / 100,
      averageEstimateMidpoint: averageEstimateMidpoint
        ? Math.round(averageEstimateMidpoint * 100) / 100
        : null,
      indexRatio: indexRatio ? Math.round(indexRatio * 1000) / 1000 : null,
    };
  }

  private async ensureUniqueSlug(baseSlug: string, excludeId?: string): Promise<string> {
    let slug = baseSlug;
    let counter = 0;

    while (true) {
      const existing = await this.prisma.artist.findUnique({
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
