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
import { FaqService } from './faq.service';

@ApiTags('faq')
@Controller('faq')
export class FaqController {
  constructor(private readonly faqService: FaqService) {}

  @Get()
  @ApiOperation({ summary: 'List FAQs with pagination, optionally filtered by category' })
  @ApiQuery({ name: 'category', required: false, type: String, description: 'Filter by FAQ category' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 20)' })
  @ApiResponse({ status: 200, description: 'Returns paginated active FAQs sorted by sortOrder' })
  async findAll(
    @Query('category') category?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.faqService.findAll({ category, page, limit, publicOnly: true });
  }

  @Get('grouped')
  @ApiOperation({ summary: 'Get all active FAQs grouped by category' })
  @ApiResponse({ status: 200, description: 'Returns FAQs grouped by category' })
  async getGroupedByCategory() {
    return this.faqService.getGroupedByCategory();
  }

  @Get('categories')
  @ApiOperation({ summary: 'List all distinct FAQ categories' })
  @ApiResponse({ status: 200, description: 'Returns array of category names' })
  async getCategories() {
    return this.faqService.getCategories();
  }

  @Get('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all FAQs for admin (including inactive)' })
  @ApiQuery({ name: 'category', required: false, type: String, description: 'Filter by FAQ category' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 50)' })
  @ApiResponse({ status: 200, description: 'Returns all FAQs including inactive' })
  async findAllAdmin(
    @Query('category') category?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.faqService.findAll({ category, page, limit, publicOnly: false });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single FAQ by ID' })
  @ApiResponse({ status: 200, description: 'Returns FAQ entry' })
  @ApiResponse({ status: 404, description: 'FAQ not found' })
  async findOne(@Param('id') id: string) {
    return this.faqService.findOne(id);
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new FAQ entry' })
  @ApiResponse({ status: 201, description: 'FAQ created successfully' })
  async create(
    @Body()
    body: {
      question: string;
      answer: string;
      category?: string;
      sortOrder?: number;
      isActive?: boolean;
    },
  ) {
    return this.faqService.create(body);
  }

  @Put(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an FAQ entry' })
  @ApiResponse({ status: 200, description: 'FAQ updated successfully' })
  @ApiResponse({ status: 404, description: 'FAQ not found' })
  async update(
    @Param('id') id: string,
    @Body()
    body: {
      question?: string;
      answer?: string;
      category?: string;
      sortOrder?: number;
      isActive?: boolean;
    },
  ) {
    return this.faqService.update(id, body);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an FAQ entry' })
  @ApiResponse({ status: 204, description: 'FAQ deleted' })
  @ApiResponse({ status: 404, description: 'FAQ not found' })
  async delete(@Param('id') id: string) {
    return this.faqService.delete(id);
  }

  @Post('reorder')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reorder FAQs by providing ordered array of IDs' })
  @ApiResponse({ status: 200, description: 'FAQs reordered successfully' })
  async reorder(@Body() body: { faqIds: string[] }) {
    return this.faqService.reorder(body.faqIds);
  }

  @Patch(':id/toggle-active')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle active/inactive status of an FAQ entry' })
  @ApiResponse({ status: 200, description: 'FAQ active status toggled' })
  @ApiResponse({ status: 404, description: 'FAQ not found' })
  async toggleActive(@Param('id') id: string) {
    return this.faqService.toggleActive(id);
  }
}
