import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PagesService } from './pages.service';

@ApiTags('pages')
@Controller('pages')
export class PagesController {
  constructor(private readonly pagesService: PagesService) {}

  @Get()
  @ApiOperation({ summary: 'List all CMS pages' })
  @ApiResponse({ status: 200, description: 'Returns all pages sorted by sortOrder' })
  async findAll() {
    return this.pagesService.findAll();
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get a page by slug' })
  @ApiResponse({ status: 200, description: 'Returns page with SEO fields' })
  async findBySlug(@Param('slug') slug: string) {
    return this.pagesService.findBySlug(slug);
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new page' })
  @ApiResponse({ status: 201, description: 'Page created successfully' })
  async create(
    @Body()
    body: {
      slug: string;
      title: string;
      contentHtml?: string;
      metaTitle?: string;
      metaDescription?: string;
      ogImageUrl?: string;
      isPublished?: boolean;
      sortOrder?: number;
    },
  ) {
    return this.pagesService.create(body);
  }

  @Put(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a page' })
  @ApiResponse({ status: 200, description: 'Page updated successfully' })
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
      sortOrder?: number;
    },
  ) {
    return this.pagesService.update(id, body);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a page' })
  async delete(@Param('id') id: string) {
    return this.pagesService.delete(id);
  }

  @Patch(':id/publish')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Publish a page' })
  async publish(@Param('id') id: string) {
    return this.pagesService.publish(id);
  }

  @Patch(':id/unpublish')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unpublish a page' })
  async unpublish(@Param('id') id: string) {
    return this.pagesService.unpublish(id);
  }
}
