import {
  Controller,
  Get,
  Post,
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
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { SearchService } from './search.service';

@ApiTags('search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'Search auctions and products' })
  @ApiQuery({
    name: 'q',
    required: true,
    type: String,
    description: 'Search query',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['auctions', 'products'],
    description: 'Index type filter',
  })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiQuery({ name: 'minPrice', required: false, type: Number })
  @ApiQuery({ name: 'maxPrice', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'condition', required: false, type: String })
  @ApiQuery({ name: 'auctionType', required: false, type: String })
  @ApiQuery({
    name: 'sort',
    required: false,
    type: String,
    description:
      'Sort: relevance (default), price_asc, price_desc, ending_soon, newest, most_bids',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Returns search results with facets and highlights',
  })
  async search(
    @Query('q') query: string,
    @Query('type') type?: string,
    @Query('category') category?: string,
    @Query('minPrice') minPrice?: number,
    @Query('maxPrice') maxPrice?: number,
    @Query('status') status?: string,
    @Query('condition') condition?: string,
    @Query('auctionType') auctionType?: string,
    @Query('sort') sort?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.searchService.search({
      query,
      type,
      category,
      minPrice,
      maxPrice,
      status,
      condition,
      auctionType,
      sort,
      page,
      limit,
    });
  }

  @Get('suggest')
  @ApiOperation({ summary: 'Get search suggestions/autocomplete' })
  @ApiQuery({
    name: 'q',
    required: true,
    type: String,
    description: 'Search prefix for autocomplete',
  })
  @ApiResponse({ status: 200, description: 'Returns autocomplete suggestions' })
  async suggest(@Query('q') query: string) {
    return this.searchService.suggest(query);
  }

  @Post('index/auction')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Index or update an auction document' })
  @ApiResponse({ status: 200, description: 'Auction indexed' })
  async indexAuction(@Body() body: any) {
    return this.searchService.indexAuction(body);
  }

  @Post('index/product')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Index or update a product document' })
  @ApiResponse({ status: 200, description: 'Product indexed' })
  async indexProduct(@Body() body: any) {
    return this.searchService.indexProduct(body);
  }

  @Delete('index/:index/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a document from an index' })
  @ApiParam({ name: 'index', enum: ['auctions', 'products'] })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Document removed' })
  async removeFromIndex(
    @Param('index') index: string,
    @Param('id') id: string,
  ) {
    return this.searchService.removeFromIndex(index, id);
  }

  @Post('reindex')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Trigger full reindex of all data from the database',
  })
  @ApiResponse({ status: 200, description: 'Reindex completed' })
  async reindex(@Body() body?: { index?: string }) {
    return this.searchService.reindex(body?.index);
  }

  // ---- Webhook endpoints for real-time indexing ----

  @Post('hooks/auction-updated')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Webhook: reindex a single auction when it is updated',
  })
  @ApiResponse({ status: 200, description: 'Auction reindexed' })
  async hookAuctionUpdated(@Body() body: { id: string; data?: any }) {
    if (body.data) {
      return this.searchService.indexAuction(body.data);
    }

    // If only ID is provided, fetch from database and reindex
    return this.searchService.indexAuction({ id: body.id, ...body });
  }

  @Post('hooks/product-updated')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Webhook: reindex a single product when it is updated',
  })
  @ApiResponse({ status: 200, description: 'Product reindexed' })
  async hookProductUpdated(@Body() body: { id: string; data?: any }) {
    if (body.data) {
      return this.searchService.indexProduct(body.data);
    }

    return this.searchService.indexProduct({ id: body.id, ...body });
  }
}
