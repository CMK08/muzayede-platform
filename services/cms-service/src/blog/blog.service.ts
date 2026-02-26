import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BlogService {
  private readonly logger = new Logger(BlogService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(query?: {
    isPublished?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    this.logger.log(`Listing blog posts: ${JSON.stringify(query || {})}`);

    const page = query?.page || 1;
    const limit = query?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query?.isPublished !== undefined) {
      where.isPublished = query.isPublished;
    }

    if (query?.search) {
      where.title = { contains: query.search, mode: 'insensitive' };
    }

    const [posts, total] = await Promise.all([
      this.prisma.blogPost.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.blogPost.count({ where }),
    ]);

    return {
      data: posts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findBySlug(slug: string) {
    this.logger.log(`Getting blog post by slug: ${slug}`);

    const post = await this.prisma.blogPost.findUnique({
      where: { slug },
    });

    if (!post) {
      throw new NotFoundException(`Blog post with slug '${slug}' not found`);
    }

    return post;
  }

  async create(dto: {
    title: string;
    slug: string;
    excerpt?: string;
    contentHtml: string;
    coverImageUrl?: string;
    authorId: string;
    metaTitle?: string;
    metaDescription?: string;
    isPublished?: boolean;
  }) {
    this.logger.log(`Creating blog post: ${dto.slug}`);

    const existing = await this.prisma.blogPost.findUnique({
      where: { slug: dto.slug },
    });

    if (existing) {
      throw new ConflictException(`Blog post with slug '${dto.slug}' already exists`);
    }

    return this.prisma.blogPost.create({
      data: {
        title: dto.title,
        slug: dto.slug,
        excerpt: dto.excerpt || null,
        contentHtml: dto.contentHtml,
        coverImageUrl: dto.coverImageUrl || null,
        authorId: dto.authorId,
        metaTitle: dto.metaTitle || null,
        metaDescription: dto.metaDescription || null,
        isPublished: dto.isPublished ?? false,
        publishedAt: dto.isPublished ? new Date() : null,
      },
    });
  }

  async update(
    id: string,
    dto: {
      title?: string;
      slug?: string;
      excerpt?: string;
      contentHtml?: string;
      coverImageUrl?: string;
      metaTitle?: string;
      metaDescription?: string;
    },
  ) {
    this.logger.log(`Updating blog post: ${id}`);

    const post = await this.prisma.blogPost.findUnique({ where: { id } });
    if (!post) {
      throw new NotFoundException(`Blog post with ID '${id}' not found`);
    }

    if (dto.slug && dto.slug !== post.slug) {
      const slugConflict = await this.prisma.blogPost.findUnique({
        where: { slug: dto.slug },
      });
      if (slugConflict) {
        throw new ConflictException(`Blog post with slug '${dto.slug}' already exists`);
      }
    }

    return this.prisma.blogPost.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.slug !== undefined && { slug: dto.slug }),
        ...(dto.excerpt !== undefined && { excerpt: dto.excerpt }),
        ...(dto.contentHtml !== undefined && { contentHtml: dto.contentHtml }),
        ...(dto.coverImageUrl !== undefined && { coverImageUrl: dto.coverImageUrl }),
        ...(dto.metaTitle !== undefined && { metaTitle: dto.metaTitle }),
        ...(dto.metaDescription !== undefined && { metaDescription: dto.metaDescription }),
      },
    });
  }

  async delete(id: string) {
    this.logger.log(`Deleting blog post: ${id}`);

    const post = await this.prisma.blogPost.findUnique({ where: { id } });
    if (!post) {
      throw new NotFoundException(`Blog post with ID '${id}' not found`);
    }

    await this.prisma.blogPost.delete({ where: { id } });
    return { deleted: true };
  }

  async publish(id: string) {
    this.logger.log(`Publishing blog post: ${id}`);

    const post = await this.prisma.blogPost.findUnique({ where: { id } });
    if (!post) {
      throw new NotFoundException(`Blog post with ID '${id}' not found`);
    }

    return this.prisma.blogPost.update({
      where: { id },
      data: {
        isPublished: true,
        publishedAt: new Date(),
      },
    });
  }

  async unpublish(id: string) {
    this.logger.log(`Unpublishing blog post: ${id}`);

    const post = await this.prisma.blogPost.findUnique({ where: { id } });
    if (!post) {
      throw new NotFoundException(`Blog post with ID '${id}' not found`);
    }

    return this.prisma.blogPost.update({
      where: { id },
      data: { isPublished: false },
    });
  }
}
