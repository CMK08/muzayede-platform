import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuctioneerService } from './auctioneer.service';
import { AbsenteeService } from '../absentee/absentee.service';
import { StreamingService } from '../streaming/streaming.service';
import { ChatService } from '../chat-service/chat.service';

@ApiTags('auctioneer')
@ApiBearerAuth()
@Controller('auctioneer')
export class AuctioneerController {
  constructor(
    private readonly auctioneerService: AuctioneerService,
    private readonly absenteeService: AbsenteeService,
    private readonly streamingService: StreamingService,
    private readonly chatService: ChatService,
  ) {}

  // ============================================================
  // Session Management
  // ============================================================

  @Post('sessions')
  @ApiOperation({ summary: 'Create a new live auctioneer session' })
  @ApiResponse({ status: 201, description: 'Session created' })
  async createSession(
    @Body() body: { auctionId: string; auctioneerId?: string },
  ) {
    return this.auctioneerService.createSession(
      body.auctionId,
      body.auctioneerId,
    );
  }

  @Post('sessions/:sessionId/start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start live auction session' })
  async startSession(@Param('sessionId') sessionId: string) {
    return this.auctioneerService.startSession(sessionId);
  }

  @Post('sessions/:sessionId/end')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'End live auction session' })
  async endSession(@Param('sessionId') sessionId: string) {
    return this.auctioneerService.endSession(sessionId);
  }

  @Get('sessions/:sessionId')
  @ApiOperation({ summary: 'Get session status with lot details' })
  async getSession(@Param('sessionId') sessionId: string) {
    return this.auctioneerService.getSession(sessionId);
  }

  // ============================================================
  // Lot Management
  // ============================================================

  @Post('sessions/:sessionId/next-lot')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Move to the next lot in the auction' })
  async nextLot(@Param('sessionId') sessionId: string) {
    return this.auctioneerService.nextLot(sessionId);
  }

  @Post(':auctionId/lots/:lotNumber/open')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Open a specific lot for bidding' })
  async openLot(
    @Param('auctionId') auctionId: string,
    @Param('lotNumber') lotNumber: number,
  ) {
    return this.auctioneerService.openLot(auctionId, lotNumber);
  }

  @Post(':auctionId/lots/:lotNumber/sold')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark lot as sold to the highest bidder' })
  async sold(
    @Param('auctionId') auctionId: string,
    @Param('lotNumber') lotNumber: number,
  ) {
    return this.auctioneerService.sold(auctionId, lotNumber);
  }

  @Post(':auctionId/lots/:lotNumber/pass')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Pass a lot (no sale)' })
  async passLot(
    @Param('auctionId') auctionId: string,
    @Param('lotNumber') lotNumber: number,
  ) {
    return this.auctioneerService.passLot(auctionId, lotNumber);
  }

  // ============================================================
  // Auctioneer Calls
  // ============================================================

  @Post(':auctionId/going-once')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Going once call (15 second countdown)' })
  async goingOnce(@Param('auctionId') auctionId: string) {
    return this.auctioneerService.goingOnce(auctionId);
  }

  @Post(':auctionId/going-twice')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Going twice call (10 second countdown)' })
  async goingTwice(@Param('auctionId') auctionId: string) {
    return this.auctioneerService.goingTwice(auctionId);
  }

  @Post('sessions/:sessionId/call')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Make an auctioneer call (going once/twice/sold/no sale)' })
  async makeCall(
    @Param('sessionId') sessionId: string,
    @Body()
    body: { call: 'going_once' | 'going_twice' | 'sold' | 'no_sale' },
  ) {
    return this.auctioneerService.makeCall(sessionId, body.call);
  }

  @Post('sessions/:sessionId/accept-bid')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept a bid in the live session' })
  async acceptBid(
    @Param('sessionId') sessionId: string,
    @Body() body: { bidId: string },
  ) {
    return this.auctioneerService.acceptBid(sessionId, body.bidId);
  }

  // ============================================================
  // Phone / Absentee Bids
  // ============================================================

  @Post(':auctionId/phone-bid')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept a phone bid on behalf of an absent bidder' })
  async acceptPhoneBid(
    @Param('auctionId') auctionId: string,
    @Body() body: { amount: number; adminUserId: string },
  ) {
    return this.auctioneerService.acceptPhoneBid(
      auctionId,
      body.amount,
      body.adminUserId,
    );
  }

  @Post(':auctionId/absentee-bids')
  @ApiOperation({ summary: 'Place an absentee bid for a lot' })
  async placeAbsenteeBid(
    @Param('auctionId') auctionId: string,
    @Body()
    body: { lotId: string; userId: string; maxAmount: number },
  ) {
    return this.absenteeService.placeAbsenteeBid(
      auctionId,
      body.lotId,
      body.userId,
      body.maxAmount,
    );
  }

  @Get(':auctionId/absentee-bids')
  @ApiOperation({ summary: 'Get all absentee bids for an auction (admin)' })
  async getAbsenteeBids(@Param('auctionId') auctionId: string) {
    return this.absenteeService.getAbsenteeBids(auctionId);
  }

  @Post('absentee-bids/:id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel an absentee bid' })
  async cancelAbsenteeBid(
    @Param('id') id: string,
    @Body() body: { userId: string },
  ) {
    return this.absenteeService.cancelAbsenteeBid(id, body.userId);
  }

  // ============================================================
  // Streaming
  // ============================================================

  @Get('stream/:auctionId')
  @ApiOperation({ summary: 'Get live session for an auction' })
  async getStreamSession(@Param('auctionId') auctionId: string) {
    return this.streamingService.getSession(auctionId);
  }

  @Post('stream/:sessionId/viewer-count')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update viewer count for a session' })
  async updateViewerCount(
    @Param('sessionId') sessionId: string,
    @Body() body: { count: number },
  ) {
    return this.streamingService.updateViewerCount(sessionId, body.count);
  }

  // ============================================================
  // Chat Management
  // ============================================================

  @Post(':auctionId/chat/mute')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mute a user in the auction chat' })
  async muteUser(
    @Param('auctionId') auctionId: string,
    @Body()
    body: { userId: string; adminId: string; durationMinutes: number },
  ) {
    return this.chatService.muteUser(
      auctionId,
      body.userId,
      body.adminId,
      body.durationMinutes,
    );
  }

  @Get(':auctionId/chat/messages')
  @ApiOperation({ summary: 'Get recent chat messages for an auction' })
  async getRecentMessages(
    @Param('auctionId') auctionId: string,
    @Query('limit') limit = 50,
  ) {
    return this.chatService.getRecentMessages(auctionId, limit);
  }
}
