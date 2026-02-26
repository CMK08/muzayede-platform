import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { AuctionService } from './auction.service';
import { CreateAuctionDto } from '../dto/create-auction.dto';
import { UpdateAuctionDto } from '../dto/update-auction.dto';

@ApiTags('auctions')
@ApiBearerAuth()
@Controller('auctions')
export class AuctionController {
  constructor(private readonly auctionService: AuctionService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new auction' })
  @ApiResponse({ status: 201, description: 'Auction created successfully' })
  async create(
    @Body() dto: CreateAuctionDto,
    @Headers('x-user-id') userId: string,
  ) {
    return this.auctionService.create(dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'List auctions with filters and pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'type', required: false, type: String })
  @ApiQuery({ name: 'categoryId', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'sort', required: false, type: String, description: 'newest | endingSoon | priceAsc | priceDesc | mostBids' })
  @ApiQuery({ name: 'minPrice', required: false, type: Number })
  @ApiQuery({ name: 'maxPrice', required: false, type: Number })
  @ApiQuery({ name: 'startDateFrom', required: false, type: String })
  @ApiQuery({ name: 'startDateTo', required: false, type: String })
  @ApiQuery({ name: 'createdBy', required: false, type: String })
  @ApiQuery({ name: 'auctionHouseId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Returns paginated auction list' })
  async findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('categoryId') categoryId?: string,
    @Query('search') search?: string,
    @Query('sort') sort?: string,
    @Query('minPrice') minPrice?: number,
    @Query('maxPrice') maxPrice?: number,
    @Query('startDateFrom') startDateFrom?: string,
    @Query('startDateTo') startDateTo?: string,
    @Query('createdBy') createdBy?: string,
    @Query('auctionHouseId') auctionHouseId?: string,
  ) {
    return this.auctionService.findAll({
      page,
      limit,
      status,
      type,
      categoryId,
      search,
      sort,
      minPrice,
      maxPrice,
      startDateFrom,
      startDateTo,
      createdBy,
      auctionHouseId,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get auction details by ID' })
  @ApiParam({ name: 'id', description: 'Auction ID' })
  @ApiResponse({ status: 200, description: 'Returns auction details with full relations' })
  @ApiResponse({ status: 404, description: 'Auction not found' })
  async findOne(@Param('id') id: string) {
    return this.auctionService.findById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update auction details (DRAFT only)' })
  @ApiParam({ name: 'id', description: 'Auction ID' })
  @ApiResponse({ status: 200, description: 'Auction updated' })
  @ApiResponse({ status: 400, description: 'Only DRAFT auctions can be updated' })
  @ApiResponse({ status: 403, description: 'Only the creator can update this auction' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAuctionDto,
    @Headers('x-user-id') userId: string,
  ) {
    return this.auctionService.update(id, dto, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancel an auction' })
  @ApiParam({ name: 'id', description: 'Auction ID' })
  @ApiResponse({ status: 204, description: 'Auction cancelled' })
  async remove(
    @Param('id') id: string,
    @Headers('x-user-id') userId: string,
    @Body('reason') reason?: string,
  ) {
    await this.auctionService.cancel(id, userId, reason);
  }

  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publish a DRAFT auction' })
  @ApiParam({ name: 'id', description: 'Auction ID' })
  @ApiResponse({ status: 200, description: 'Auction published' })
  @ApiResponse({ status: 400, description: 'Validation failed or invalid state transition' })
  async publish(
    @Param('id') id: string,
    @Headers('x-user-id') userId: string,
  ) {
    return this.auctionService.publish(id, userId);
  }

  @Post(':id/start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually start an auction' })
  @ApiParam({ name: 'id', description: 'Auction ID' })
  @ApiResponse({ status: 200, description: 'Auction started' })
  async start(@Param('id') id: string) {
    return this.auctionService.start(id);
  }

  @Post(':id/end')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually end an auction' })
  @ApiParam({ name: 'id', description: 'Auction ID' })
  @ApiResponse({ status: 200, description: 'Auction ended' })
  async end(@Param('id') id: string) {
    return this.auctionService.end(id);
  }

  // ---------------------------------------------------------------------------
  // FOLLOW ENDPOINTS
  // ---------------------------------------------------------------------------

  @Post(':id/follow')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Follow an auction' })
  @ApiParam({ name: 'id', description: 'Auction ID' })
  @ApiResponse({ status: 201, description: 'Now following the auction' })
  @ApiResponse({ status: 400, description: 'Already following' })
  @ApiResponse({ status: 404, description: 'Auction not found' })
  async follow(
    @Param('id') id: string,
    @Headers('x-user-id') userId: string,
  ) {
    return this.auctionService.follow(id, userId);
  }

  @Delete(':id/follow')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unfollow an auction' })
  @ApiParam({ name: 'id', description: 'Auction ID' })
  @ApiResponse({ status: 200, description: 'Unfollowed the auction' })
  @ApiResponse({ status: 404, description: 'Auction not found or not following' })
  async unfollow(
    @Param('id') id: string,
    @Headers('x-user-id') userId: string,
  ) {
    return this.auctionService.unfollow(id, userId);
  }

  @Get(':id/followers')
  @ApiOperation({ summary: 'Get follower count for an auction' })
  @ApiParam({ name: 'id', description: 'Auction ID' })
  @ApiResponse({ status: 200, description: 'Returns follower count' })
  @ApiResponse({ status: 404, description: 'Auction not found' })
  async getFollowers(@Param('id') id: string) {
    return this.auctionService.getFollowersCount(id);
  }
}
