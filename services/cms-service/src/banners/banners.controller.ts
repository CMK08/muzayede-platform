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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { BannersService } from './banners.service';

@ApiTags('banners')
@Controller('banners')
export class BannersController {
  constructor(private readonly bannersService: BannersService) {}

  @Get()
  @ApiOperation({ summary: 'List all banners' })
  @ApiQuery({ name: 'position', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Returns all banners' })
  async findAll(@Query('position') position?: string) {
    return this.bannersService.findAll(position);
  }

  @Get('active/:position')
  @ApiOperation({ summary: 'Get active banners for a specific position' })
  @ApiResponse({ status: 200, description: 'Returns active banners within valid date range' })
  async getActiveBanners(@Param('position') position: string) {
    return this.bannersService.getActiveBanners(position);
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
