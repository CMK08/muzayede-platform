import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
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
import { BannersService } from './banners.service';

@ApiTags('banners')
@Controller('banners')
export class BannersController {
  constructor(private readonly bannersService: BannersService) {}

  @Get()
  @ApiOperation({ summary: 'List all banners with pagination' })
  @ApiQuery({ name: 'position', required: false, type: String, description: 'Filter by position (home_hero, home_sidebar, etc.)' })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean, description: 'Filter by active status' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 20)' })
  @ApiResponse({ status: 200, description: 'Returns paginated banners' })
  async findAll(
    @Query('position') position?: string,
    @Query('isActive') isActive?: boolean,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.bannersService.findAll({ position, isActive, page, limit });
  }

  @Get('active/:position')
  @ApiOperation({ summary: 'Get active banners for a specific position' })
  @ApiResponse({ status: 200, description: 'Returns active banners within valid date range, sorted by sort_order' })
  async getActiveBanners(@Param('position') position: string) {
    return this.bannersService.getActiveBanners(position);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single banner by ID' })
  @ApiResponse({ status: 200, description: 'Returns banner details' })
  @ApiResponse({ status: 404, description: 'Banner not found' })
  async findOne(@Param('id') id: string) {
    return this.bannersService.findOne(id);
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new banner' })
  @ApiResponse({ status: 201, description: 'Banner created successfully' })
  async create(
    @Body()
    body: {
      title: string;
      imageUrl: string;
      mobileImageUrl?: string;
      linkUrl?: string;
      position?: string;
      sortOrder?: number;
      isActive?: boolean;
      startDate?: string;
      endDate?: string;
    },
  ) {
    return this.bannersService.create(body);
  }

  @Put(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a banner' })
  @ApiResponse({ status: 200, description: 'Banner updated successfully' })
  @ApiResponse({ status: 404, description: 'Banner not found' })
  async update(
    @Param('id') id: string,
    @Body()
    body: {
      title?: string;
      imageUrl?: string;
      mobileImageUrl?: string;
      linkUrl?: string;
      position?: string;
      sortOrder?: number;
      isActive?: boolean;
      startDate?: string;
      endDate?: string;
    },
  ) {
    return this.bannersService.update(id, body);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a banner' })
  @ApiResponse({ status: 204, description: 'Banner deleted' })
  @ApiResponse({ status: 404, description: 'Banner not found' })
  async delete(@Param('id') id: string) {
    return this.bannersService.delete(id);
  }

  @Post('reorder')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reorder banners by providing ordered array of IDs' })
  @ApiResponse({ status: 200, description: 'Banners reordered successfully' })
  async reorder(@Body() body: { bannerIds: string[] }) {
    return this.bannersService.reorder(body.bannerIds);
  }
}
