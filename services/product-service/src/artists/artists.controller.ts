import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ArtistsService } from './artists.service';
import { CreateArtistDto, UpdateArtistDto, QueryArtistDto } from '../common/dto/create-artist.dto';

@ApiTags('artists')
@Controller('artists')
export class ArtistsController {
  constructor(private readonly artistsService: ArtistsService) {}

  @Get()
  @ApiOperation({ summary: 'List artists with pagination and search' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Returns paginated artists list' })
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
    @Query('search') search?: string,
  ) {
    return this.artistsService.findAll({ page, limit, search });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get artist details with products and exhibitions' })
  @ApiResponse({ status: 200, description: 'Returns artist details' })
  @ApiResponse({ status: 404, description: 'Artist not found' })
  async findById(@Param('id') id: string) {
    return this.artistsService.findById(id);
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new artist (admin only)' })
  @ApiResponse({ status: 201, description: 'Artist created' })
  async create(@Body() dto: CreateArtistDto) {
    return this.artistsService.create(dto);
  }

  @Put(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an artist' })
  @ApiResponse({ status: 200, description: 'Artist updated' })
  @ApiResponse({ status: 404, description: 'Artist not found' })
  async update(@Param('id') id: string, @Body() dto: UpdateArtistDto) {
    return this.artistsService.update(id, dto);
  }

  @Get(':id/price-index')
  @ApiOperation({ summary: 'Calculate and get artist price index from historical sales' })
  @ApiResponse({ status: 200, description: 'Returns price index data' })
  @ApiResponse({ status: 404, description: 'Artist not found' })
  async getPriceIndex(@Param('id') id: string) {
    return this.artistsService.calculatePriceIndex(id);
  }
}
