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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { BlogService } from './blog.service';

@ApiTags('blog')
@Controller('blog')
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  @Get()
  @ApiOperation({ summary: 'List blog posts with pagination' })
  @ApiQuery({ name: 'isPublished', required: false, type: Boolean })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Returns paginated blog posts' })
  async findAll(
    @Query('isPublished') isPublished?: boolean,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.blogService.findAll({ isPublished, search, page, limit });
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get a blog post by slug' })
  @ApiResponse({ status: 200, description: 'Returns blog post' })
  async findBySlug(@Param('slug') slug: string) {
    return this.blogService.findBySlug(slug);
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new blog post' })
  @ApiResponse({ status: 201, description: 'Blog post created successfully' })
  async create(
    @Body()
    body: {
      title: string;
      slug: string;
      excerpt?: string;
      contentHtml: string;
      coverImageUrl?: string;
      authorId: string;
      metaTitle?: string;
      metaDescription?: string;
      isPublished?: boolean;
    },
  ) {
    return this.blogService.create(body);
  }

  @Put(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a blog post' })
  @ApiResponse({ status: 200, description: 'Blog post updated successfully' })
  async update(
    @Param('id') id: string,
    @Body()
    body: {
      title?: string;
      slug?: string;
      excerpt?: string;
      contentHtml?: string;
      coverImageUrl?: string;
      metaTitle?: string;
      metaDescription?: string;
    },
  ) {
    return this.blogService.update(id, body);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a blog post' })
  async delete(@Param('id') id: string) {
    return this.blogService.delete(id);
  }

  @Patch(':id/publish')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Publish a blog post' })
  async publish(@Param('id') id: string) {
    return this.blogService.publish(id);
  }

  @Patch(':id/unpublish')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unpublish a blog post' })
  async unpublish(@Param('id') id: string) {
    return this.blogService.unpublish(id);
  }
}
