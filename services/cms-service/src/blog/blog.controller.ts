import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { BlogService } from './blog.service';

@ApiTags('blog')
@Controller('blog')
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  @Get()
  @ApiOperation({ summary: 'List blog posts with pagination and full-text search by title' })
  @ApiQuery({ name: 'status', required: false, enum: ['draft', 'published'], description: 'Filter by publication status' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Full-text search by title' })
  @ApiQuery({ name: 'tag', required: false, type: String, description: 'Filter by tag' })
  @ApiQuery({ name: 'author', required: false, type: String, description: 'Filter by author name' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 20)' })
  @ApiResponse({ status: 200, description: 'Returns paginated blog posts' })
  async findAll(
    @Query('status') status?: 'draft' | 'published',
    @Query('search') search?: string,
    @Query('tag') tag?: string,
    @Query('author') author?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.blogService.findAll({ status, search, tag, author, page, limit });
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get a blog post by slug' })
  @ApiResponse({ status: 200, description: 'Returns blog post with all fields' })
  @ApiResponse({ status: 404, description: 'Blog post not found' })
  async findBySlug(@Param('slug') slug: string) {
    return this.blogService.findBySlug(slug);
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new blog post' })
  @ApiResponse({ status: 201, description: 'Blog post created successfully' })
  @ApiResponse({ status: 409, description: 'Blog post with this slug already exists' })
  async create(
    @Body()
    body: {
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
    },
  ) {
    return this.blogService.create(body);
  }

  @Put(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a blog post' })
  @ApiResponse({ status: 200, description: 'Blog post updated successfully' })
  @ApiResponse({ status: 404, description: 'Blog post not found' })
  @ApiResponse({ status: 409, description: 'Slug conflict' })
  async update(
    @Param('id') id: string,
    @Body()
    body: {
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
    return this.blogService.update(id, body);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a blog post' })
  @ApiResponse({ status: 204, description: 'Blog post deleted' })
  @ApiResponse({ status: 404, description: 'Blog post not found' })
  async delete(@Param('id') id: string) {
    return this.blogService.delete(id);
  }

  @Patch(':id/publish')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Publish a blog post' })
  @ApiResponse({ status: 200, description: 'Blog post published with publishedAt timestamp' })
  @ApiResponse({ status: 404, description: 'Blog post not found' })
  async publish(@Param('id') id: string) {
    return this.blogService.publish(id);
  }

  @Patch(':id/unpublish')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unpublish a blog post (revert to draft)' })
  @ApiResponse({ status: 200, description: 'Blog post unpublished' })
  @ApiResponse({ status: 404, description: 'Blog post not found' })
  async unpublish(@Param('id') id: string) {
    return this.blogService.unpublish(id);
  }
}
