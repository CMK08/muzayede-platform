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
import { PagesService } from './pages.service';

@ApiTags('pages')
@Controller('pages')
export class PagesController {
  constructor(private readonly pagesService: PagesService) {}

  @Get()
  @ApiOperation({ summary: 'List all CMS pages with pagination' })
  @ApiQuery({ name: 'status', required: false, enum: ['draft', 'published'], description: 'Filter by publication status' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 20)' })
  @ApiResponse({ status: 200, description: 'Returns paginated pages sorted by sortOrder' })
  async findAll(
    @Query('status') status?: 'draft' | 'published',
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.pagesService.findAll({ status, page, limit });
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get a page by slug' })
  @ApiResponse({ status: 200, description: 'Returns page with SEO fields (metaTitle, metaDescription, ogImageUrl)' })
  @ApiResponse({ status: 404, description: 'Page not found' })
  async findBySlug(@Param('slug') slug: string) {
    return this.pagesService.findBySlug(slug);
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new static page' })
  @ApiResponse({ status: 201, description: 'Page created successfully' })
  @ApiResponse({ status: 409, description: 'Page with this slug already exists' })
  async create(
    @Body()
    body: {
      slug: string;
      title: string;
      contentHtml?: string;
      metaTitle?: string;
      metaDescription?: string;
      ogImageUrl?: string;
      status?: 'draft' | 'published';
      sortOrder?: number;
    },
  ) {
    return this.pagesService.create(body);
  }

  @Put(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a page' })
  @ApiResponse({ status: 200, description: 'Page updated successfully' })
  @ApiResponse({ status: 404, description: 'Page not found' })
  @ApiResponse({ status: 409, description: 'Slug conflict' })
  async update(
    @Param('id') id: string,
    @Body()
    body: {
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
    return this.pagesService.update(id, body);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a page' })
  @ApiResponse({ status: 204, description: 'Page deleted' })
  @ApiResponse({ status: 404, description: 'Page not found' })
  async delete(@Param('id') id: string) {
    return this.pagesService.delete(id);
  }

  @Patch(':id/publish')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Publish a page (set status to published)' })
  @ApiResponse({ status: 200, description: 'Page published' })
  @ApiResponse({ status: 404, description: 'Page not found' })
  async publish(@Param('id') id: string) {
    return this.pagesService.publish(id);
  }

  @Patch(':id/unpublish')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unpublish a page (set status to draft)' })
  @ApiResponse({ status: 200, description: 'Page unpublished' })
  @ApiResponse({ status: 404, description: 'Page not found' })
  async unpublish(@Param('id') id: string) {
    return this.pagesService.unpublish(id);
  }
}
