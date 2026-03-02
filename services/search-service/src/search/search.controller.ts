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
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { SearchService } from './search.service';
import { IndexerService } from '../indexer/indexer.service';

@ApiTags('search')
@Controller('search')
export class SearchController {
  private readonly logger = new Logger(SearchController.name);

  constructor(
    private readonly searchService: SearchService,
    private readonly indexerService: IndexerService,
  ) {}

  // ─── Search Endpoints ─────────────────────────────────────────────

  /**
   * GET /search?q=&category=&minPrice=&maxPrice=&condition=&type=&sort=&page=&limit=
   *
   * Full-text search across products and auctions with faceted filtering.
   */
  @Get()
  @ApiOperation({ summary: 'Search auctions and products' })
  @ApiQuery({
    name: 'q',
    required: false,
    type: String,
    description: 'Search query text',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['auctions', 'products'],
    description: 'Search target: auctions, products, or both (default)',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    type: String,
    description: 'Filter by category name',
  })
  @ApiQuery({
    name: 'minPrice',
    required: false,
    type: Number,
    description: 'Minimum price filter',
  })
  @ApiQuery({
    name: 'maxPrice',
    required: false,
    type: Number,
    description: 'Maximum price filter',
  })
  @ApiQuery({
    name: 'condition',
    required: false,
    enum: ['NEW', 'USED', 'RESTORED'],
    description: 'Product condition filter',
  })
  @ApiQuery({
    name: 'auctionType',
    required: false,
    enum: ['ENGLISH', 'DUTCH', 'SEALED_BID', 'VICKREY', 'TIMED', 'HYBRID'],
    description: 'Auction type filter',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: [
      'DRAFT',
      'PUBLISHED',
      'PRE_BID',
      'LIVE',
      'COMPLETED',
      'CANCELLED',
      'ARCHIVED',
    ],
    description: 'Auction status filter',
  })
  @ApiQuery({
    name: 'sort',
    required: false,
    enum: [
      'relevance',
      'price_asc',
      'price_desc',
      'ending_soon',
      'newest',
      'date',
      'most_bids',
    ],
    description: 'Sort order',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Results per page (default: 20, max: 100)',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns search results with facets and highlights',
  })
  async search(
    @Query('q') query?: string,
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
    // Clamp limit to a reasonable maximum
    const clampedLimit = Math.min(Math.max(1, limit), 100);
    const clampedPage = Math.max(1, page);

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
      page: clampedPage,
      limit: clampedLimit,
    });
  }

  // ─── Suggestions Endpoint ─────────────────────────────────────────

  /**
   * GET /search/suggestions?q=
   *
   * Returns completion-based suggestions for a search prefix.
   * Uses the ES completion suggester for fast prefix-based results.
   */
  @Get('suggestions')
  @ApiOperation({ summary: 'Get search suggestions for a prefix' })
  @ApiQuery({
    name: 'q',
    required: true,
    type: String,
    description: 'Search prefix for suggestions',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns suggested search terms',
  })
  async suggestions(@Query('q') query: string) {
    return this.searchService.suggestions(query);
  }

  // ─── Autocomplete Endpoint ────────────────────────────────────────

  /**
   * GET /search/autocomplete?q=
   *
   * Returns structured autocomplete results with document details
   * (id, title, type, image, price, category). Uses edge-ngram
   * analyzer for search-as-you-type behavior.
   */
  @Get('autocomplete')
  @ApiOperation({ summary: 'Autocomplete search with document previews' })
  @ApiQuery({
    name: 'q',
    required: true,
    type: String,
    description: 'Search prefix for autocomplete (min 2 characters)',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns autocomplete items with document details',
  })
  async autocomplete(@Query('q') query: string) {
    return this.searchService.autocomplete(query);
  }

  // ─── Legacy Suggest Endpoint ──────────────────────────────────────

  /**
   * GET /search/suggest?q=
   *
   * Backward-compatible suggest endpoint. Returns a simple string array.
   */
  @Get('suggest')
  @ApiOperation({ summary: 'Get search suggestions/autocomplete (legacy)' })
  @ApiQuery({
    name: 'q',
    required: true,
    type: String,
    description: 'Search prefix for autocomplete',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns autocomplete suggestions as string array',
  })
  async suggest(@Query('q') query: string) {
    return this.searchService.suggest(query);
  }

  // ─── Admin: Reindex ───────────────────────────────────────────────

  /**
   * POST /search/reindex
   *
   * Triggers a full reindex of all data from PostgreSQL into Elasticsearch.
   * Optionally targets a specific index. Set recreate=true to drop and
   * recreate indices before indexing.
   */
  @Post('reindex')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Trigger full reindex of all data from the database (admin)',
  })
  @ApiResponse({ status: 200, description: 'Reindex completed' })
  async reindex(
    @Body() body?: { index?: string; recreate?: boolean },
  ) {
    this.logger.log(
      `Reindex requested: index=${body?.index || 'all'}, recreate=${body?.recreate || false}`,
    );

    const recreate = body?.recreate || false;

    if (body?.index === 'products') {
      const products = await this.indexerService.reindexAllProducts(recreate);
      return { message: 'Product reindex completed', products };
    }

    if (body?.index === 'auctions') {
      const auctions = await this.indexerService.reindexAllAuctions(recreate);
      return { message: 'Auction reindex completed', auctions };
    }

    const result = await this.indexerService.reindexAll(recreate);
    return { message: 'Full reindex completed', ...result };
  }

  // ─── Webhook: Index / Update Single Documents ─────────────────────

  /**
   * POST /search/hooks/product-updated
   *
   * Webhook endpoint for product create/update events. Fetches the product
   * from the database and re-indexes it.
   */
  @Post('hooks/product-updated')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Webhook: reindex a single product when created or updated',
  })
  @ApiResponse({ status: 200, description: 'Product reindexed' })
  async hookProductUpdated(@Body() body: { id: string }) {
    if (!body.id) {
      return { indexed: false, error: 'Missing product id' };
    }

    const result = await this.indexerService.indexProduct(body.id);
    return { indexed: result, id: body.id };
  }

  /**
   * POST /search/hooks/product-deleted
   *
   * Webhook endpoint for product deletion events.
   */
  @Post('hooks/product-deleted')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Webhook: remove a product from the index when deleted',
  })
  @ApiResponse({ status: 200, description: 'Product removed from index' })
  async hookProductDeleted(@Body() body: { id: string }) {
    if (!body.id) {
      return { removed: false, error: 'Missing product id' };
    }

    const result = await this.indexerService.removeProduct(body.id);
    return { removed: result, id: body.id };
  }

  /**
   * POST /search/hooks/auction-updated
   *
   * Webhook endpoint for auction create/update events.
   */
  @Post('hooks/auction-updated')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Webhook: reindex a single auction when created or updated',
  })
  @ApiResponse({ status: 200, description: 'Auction reindexed' })
  async hookAuctionUpdated(@Body() body: { id: string }) {
    if (!body.id) {
      return { indexed: false, error: 'Missing auction id' };
    }

    const result = await this.indexerService.indexAuction(body.id);
    return { indexed: result, id: body.id };
  }

  /**
   * POST /search/hooks/auction-deleted
   *
   * Webhook endpoint for auction deletion events.
   */
  @Post('hooks/auction-deleted')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Webhook: remove an auction from the index when deleted',
  })
  @ApiResponse({ status: 200, description: 'Auction removed from index' })
  async hookAuctionDeleted(@Body() body: { id: string }) {
    if (!body.id) {
      return { removed: false, error: 'Missing auction id' };
    }

    const result = await this.indexerService.removeAuction(body.id);
    return { removed: result, id: body.id };
  }

  // ─── Manual Index / Delete Document ──────────────────────────────

  @Post('index/product')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Index or update a product by ID' })
  @ApiResponse({ status: 200, description: 'Product indexed' })
  async indexProduct(@Body() body: { id: string }) {
    if (!body.id) {
      return { indexed: false, error: 'Missing product id' };
    }
    const result = await this.indexerService.indexProduct(body.id);
    return { indexed: result, id: body.id };
  }

  @Post('index/auction')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Index or update an auction by ID' })
  @ApiResponse({ status: 200, description: 'Auction indexed' })
  async indexAuction(@Body() body: { id: string }) {
    if (!body.id) {
      return { indexed: false, error: 'Missing auction id' };
    }
    const result = await this.indexerService.indexAuction(body.id);
    return { indexed: result, id: body.id };
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
    if (index === 'products') {
      const result = await this.indexerService.removeProduct(id);
      return { removed: result };
    }
    if (index === 'auctions') {
      const result = await this.indexerService.removeAuction(id);
      return { removed: result };
    }
    return { removed: false, error: `Unknown index: ${index}` };
  }
}
