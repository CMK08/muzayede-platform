import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  Ip,
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
import { BidService } from './bid.service';
import {
  PlaceBidDto,
  RetractBidDto,
  ProxyBidDto,
  BidQueryDto,
  UserBidQueryDto,
} from './dto/place-bid.dto';

@ApiTags('bids')
@ApiBearerAuth()
@Controller('bids')
export class BidController {
  constructor(private readonly bidService: BidService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Place a bid on an auction' })
  @ApiResponse({ status: 201, description: 'Bid placed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid bid amount or auction not active' })
  @ApiResponse({ status: 403, description: 'User forbidden from bidding' })
  @ApiResponse({ status: 409, description: 'Bid conflict (outbid during processing)' })
  async placeBid(
    @Body() dto: PlaceBidDto,
    @Headers('x-user-id') userId: string,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string,
    @Headers('x-device-fingerprint') deviceFingerprint?: string,
  ) {
    return this.bidService.placeBid(dto, userId, ipAddress, userAgent, deviceFingerprint);
  }

  @Get('auction/:auctionId')
  @ApiOperation({ summary: 'Get bid history for an auction' })
  @ApiParam({ name: 'auctionId', type: String })
  @ApiResponse({ status: 200, description: 'Returns bid history' })
  async getAuctionBids(
    @Param('auctionId') auctionId: string,
    @Query() query: BidQueryDto,
    @Headers('x-user-id') userId?: string,
  ) {
    return this.bidService.getAuctionBids(auctionId, query, userId);
  }

  @Get('auction/:auctionId/highest')
  @ApiOperation({ summary: 'Get current highest bid for an auction' })
  @ApiParam({ name: 'auctionId', type: String })
  @ApiResponse({ status: 200, description: 'Returns highest bid' })
  async getHighestBid(@Param('auctionId') auctionId: string) {
    return this.bidService.getHighestBid(auctionId);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get all bids by a user' })
  @ApiParam({ name: 'userId', type: String })
  @ApiResponse({ status: 200, description: 'Returns user bid history' })
  async getUserBids(
    @Param('userId') userId: string,
    @Query() query: UserBidQueryDto,
  ) {
    return this.bidService.getUserBids(userId, query);
  }

  @Post(':bidId/retract')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Retract a bid (within 5 minutes)' })
  @ApiParam({ name: 'bidId', type: String })
  @ApiResponse({ status: 200, description: 'Bid retracted successfully' })
  @ApiResponse({ status: 400, description: 'Bid cannot be retracted' })
  @ApiResponse({ status: 403, description: 'Not your bid' })
  async retractBid(
    @Param('bidId') bidId: string,
    @Headers('x-user-id') userId: string,
    @Body() dto: RetractBidDto,
  ) {
    return this.bidService.retractBid(bidId, userId, dto.reason);
  }

  @Post('proxy')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Set up a proxy (automatic) bid' })
  @ApiResponse({ status: 201, description: 'Proxy bid set up successfully' })
  async setProxyBid(
    @Body() dto: ProxyBidDto,
    @Headers('x-user-id') userId: string,
  ) {
    return this.bidService.setupProxyBid(dto.auctionId, userId, dto.maxAmount);
  }

  @Delete('proxy/:auctionId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a proxy bid' })
  @ApiParam({ name: 'auctionId', type: String })
  @ApiResponse({ status: 200, description: 'Proxy bid cancelled' })
  async cancelProxyBid(
    @Param('auctionId') auctionId: string,
    @Headers('x-user-id') userId: string,
  ) {
    return this.bidService.cancelProxyBid(auctionId, userId);
  }
}
