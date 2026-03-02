import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { StreamingService } from './streaming.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../guards/roles.guard';

@ApiTags('live')
@ApiBearerAuth()
@Controller('live/stream')
export class StreamingController {
  constructor(private readonly streamingService: StreamingService) {}

  @Post('sessions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'AUCTION_HOUSE')
  @ApiOperation({
    summary: 'Create a live streaming session for an auction',
    description:
      'Generates RTMP ingest URL and HLS playback URL. Broadcaster can also use WebRTC via /webrtc namespace.',
  })
  @ApiResponse({ status: 201, description: 'Session created with stream URLs' })
  async createSession(@Body() body: { auctionId: string }) {
    return this.streamingService.createSession(body.auctionId);
  }

  @Post('sessions/:sessionId/start')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'AUCTION_HOUSE')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start the live stream' })
  @ApiResponse({ status: 200, description: 'Stream started' })
  async startStream(@Param('sessionId') sessionId: string) {
    return this.streamingService.startStream(sessionId);
  }

  @Post('sessions/:sessionId/end')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'AUCTION_HOUSE')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'End the live stream' })
  @ApiResponse({ status: 200, description: 'Stream ended' })
  async endStream(@Param('sessionId') sessionId: string) {
    return this.streamingService.endStream(sessionId);
  }

  @Get(':auctionId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get live stream info for an auction' })
  @ApiResponse({ status: 200, description: 'Stream session details' })
  async getSession(@Param('auctionId') auctionId: string) {
    return this.streamingService.getSession(auctionId);
  }

  @Post('sessions/:sessionId/viewer-count')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update viewer count' })
  async updateViewerCount(
    @Param('sessionId') sessionId: string,
    @Body() body: { count: number },
  ) {
    return this.streamingService.updateViewerCount(sessionId, body.count);
  }
}
