import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PagesService {
  private readonly logger = new Logger(PagesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(query?: {
    status?: 'draft' | 'published';
    page?: number;
    limit?: number;
  }) {
    this.logger.log(`Listing pages: ${JSON.stringify(query || {})}`);

    const page = query?.page || 1;
    const limit = query?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query?.status === 'published') {
      where.isPublished = true;
    } else if (query?.status === 'draft') {
      where.isPublished = false;
    }

    const [pages, total] = await Promise.all([
      this.prisma.page.findMany({
        where,
        orderBy: { sortOrder: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.page.count({ where }),
    ]);

    return {
      data: pages,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findBySlug(slug: string) {
    this.logger.log(`Getting page by slug: ${slug}`);
    const page = await this.prisma.page.findUnique({
      where: { slug },
    });

    if (!page) {
      throw new NotFoundException(`Page with slug '${slug}' not found`);
    }

    return page;
  }

  async create(dto: {
    slug: string;
    title: string;
    contentHtml?: string;
    metaTitle?: string;
    metaDescription?: string;
    ogImageUrl?: string;
    status?: 'draft' | 'published';
    sortOrder?: number;
  }) {
    this.logger.log(`Creating page: ${dto.slug}`);

    const existing = await this.prisma.page.findUnique({
      where: { slug: dto.slug },
    });

    if (existing) {
      throw new ConflictException(`Page with slug '${dto.slug}' already exists`);
    }

    const isPublished = dto.status === 'published';

    return this.prisma.page.create({
      data: {
        slug: dto.slug,
        title: dto.title,
        contentHtml: dto.contentHtml || null,
        metaTitle: dto.metaTitle || null,
        metaDescription: dto.metaDescription || null,
        ogImageUrl: dto.ogImageUrl || null,
        isPublished,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async update(
    id: string,
    dto: {
      slug?: string;
      title?: string;
      contentHtml?: string;
      metaTitle?: string;
      metaDescription?: string;
      ogImageUrl?: string;
      status?: 'draft' | 'published';
      sortOrder?: number;
    },
  ) {
    this.logger.log(`Updating page: ${id}`);

    const page = await this.prisma.page.findUnique({ where: { id } });
    if (!page) {
      throw new NotFoundException(`Page with ID '${id}' not found`);
    }

    if (dto.slug && dto.slug !== page.slug) {
      const slugConflict = await this.prisma.page.findUnique({
        where: { slug: dto.slug },
      });
      if (slugConflict) {
        throw new ConflictException(`Page with slug '${dto.slug}' already exists`);
      }
    }

    return this.prisma.page.update({
      where: { id },
      data: {
        ...(dto.slug !== undefined && { slug: dto.slug }),
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.contentHtml !== undefined && { contentHtml: dto.contentHtml }),
        ...(dto.metaTitle !== undefined && { metaTitle: dto.metaTitle }),
        ...(dto.metaDescription !== undefined && { metaDescription: dto.metaDescription }),
        ...(dto.ogImageUrl !== undefined && { ogImageUrl: dto.ogImageUrl }),
        ...(dto.status !== undefined && { isPublished: dto.status === 'published' }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      },
    });
  }

  async delete(id: string) {
    this.logger.log(`Deleting page: ${id}`);

    const page = await this.prisma.page.findUnique({ where: { id } });
    if (!page) {
      throw new NotFoundException(`Page with ID '${id}' not found`);
    }

    await this.prisma.page.delete({ where: { id } });
    return { deleted: true };
  }

  async publish(id: string) {
    this.logger.log(`Publishing page: ${id}`);

    const page = await this.prisma.page.findUnique({ where: { id } });
    if (!page) {
      throw new NotFoundException(`Page with ID '${id}' not found`);
    }

    return this.prisma.page.update({
      where: { id },
      data: { isPublished: true },
    });
  }

  async unpublish(id: string) {
    this.logger.log(`Unpublishing page: ${id}`);

    const page = await this.prisma.page.findUnique({ where: { id } });
    if (!page) {
      throw new NotFoundException(`Page with ID '${id}' not found`);
    }

    return this.prisma.page.update({
      where: { id },
      data: { isPublished: false },
    });
  }
}
