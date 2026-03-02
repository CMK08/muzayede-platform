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
    status?: 'draft' | 'published';
    search?: string;
    tag?: string;
    author?: string;
    page?: number;
    limit?: number;
  }) {
    this.logger.log(`Listing blog posts: ${JSON.stringify(query || {})}`);

    const page = query?.page || 1;
    const limit = query?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query?.status === 'published') {
      where.isPublished = true;
    } else if (query?.status === 'draft') {
      where.isPublished = false;
    }

    if (query?.search) {
      where.title = { contains: query.search, mode: 'insensitive' };
    }

    if (query?.tag) {
      where.tags = { has: query.tag };
    }

    if (query?.author) {
      where.author = { contains: query.author, mode: 'insensitive' };
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
    coverImage?: string;
    author: string;
    authorId: string;
    tags?: string[];
    metaTitle?: string;
    metaDescription?: string;
    ogImageUrl?: string;
    status?: 'draft' | 'published';
  }) {
    this.logger.log(`Creating blog post: ${dto.slug}`);

    const existing = await this.prisma.blogPost.findUnique({
      where: { slug: dto.slug },
    });

    if (existing) {
      throw new ConflictException(`Blog post with slug '${dto.slug}' already exists`);
    }

    const isPublished = dto.status === 'published';

    return this.prisma.blogPost.create({
      data: {
        title: dto.title,
        slug: dto.slug,
        excerpt: dto.excerpt || null,
        contentHtml: dto.contentHtml,
        coverImageUrl: dto.coverImage || null,
        author: dto.author,
        authorId: dto.authorId,
        tags: dto.tags || [],
        metaTitle: dto.metaTitle || null,
        metaDescription: dto.metaDescription || null,
        ogImageUrl: dto.ogImageUrl || null,
        isPublished,
        publishedAt: isPublished ? new Date() : null,
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
      coverImage?: string;
      author?: string;
      tags?: string[];
      metaTitle?: string;
      metaDescription?: string;
      ogImageUrl?: string;
      status?: 'draft' | 'published';
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

    const data: any = {};

    if (dto.title !== undefined) data.title = dto.title;
    if (dto.slug !== undefined) data.slug = dto.slug;
    if (dto.excerpt !== undefined) data.excerpt = dto.excerpt;
    if (dto.contentHtml !== undefined) data.contentHtml = dto.contentHtml;
    if (dto.coverImage !== undefined) data.coverImageUrl = dto.coverImage;
    if (dto.author !== undefined) data.author = dto.author;
    if (dto.tags !== undefined) data.tags = dto.tags;
    if (dto.metaTitle !== undefined) data.metaTitle = dto.metaTitle;
    if (dto.metaDescription !== undefined) data.metaDescription = dto.metaDescription;
    if (dto.ogImageUrl !== undefined) data.ogImageUrl = dto.ogImageUrl;

    if (dto.status !== undefined) {
      data.isPublished = dto.status === 'published';
      if (dto.status === 'published' && !post.isPublished) {
        data.publishedAt = new Date();
      }
    }

    return this.prisma.blogPost.update({
      where: { id },
      data,
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
