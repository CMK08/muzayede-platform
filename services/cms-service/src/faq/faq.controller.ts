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
import { FaqService } from './faq.service';

@ApiTags('faq')
@Controller('faq')
export class FaqController {
  constructor(private readonly faqService: FaqService) {}

  @Get()
  @ApiOperation({ summary: 'List FAQs, optionally filtered by category' })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Returns active FAQs sorted by sortOrder' })
  async findAll(@Query('category') category?: string) {
    return this.faqService.findAll(category, true);
  }

  @Get('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all FAQs for admin (including inactive)' })
  @ApiQuery({ name: 'category', required: false, type: String })
  async findAllAdmin(@Query('category') category?: string) {
    return this.faqService.findAll(category, false);
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
  async update(
    @Param('id') id: string,
    @Body()
    body: {
      question?: string;
      answer?: string;
      category?: string;
      sortOrder?: number;
    },
  ) {
    return this.faqService.update(id, body);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an FAQ entry' })
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
  @ApiOperation({ summary: 'Toggle active status of an FAQ entry' })
  async toggleActive(@Param('id') id: string) {
    return this.faqService.toggleActive(id);
  }
}
