import {
  Controller,
  Get,
  Post,
  Body,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { BadgesService } from './badges.service';

@ApiTags('badges')
@ApiBearerAuth()
@Controller('blockchain/badges')
export class BadgesController {
  constructor(private readonly badgesService: BadgesService) {}

  @Post('award')
  @ApiOperation({ summary: 'Award a badge to a user' })
  @ApiResponse({ status: 201, description: 'Badge awarded successfully' })
  async awardBadge(
    @Body() body: { userId: string; badgeType: 'BRONZE' | 'SILVER' | 'GOLD' | 'DIAMOND' },
  ) {
    return this.badgesService.awardBadge(body.userId, body.badgeType);
  }

  @Post('check/:userId')
  @ApiOperation({ summary: 'Check and award all eligible badges for a user' })
  @ApiResponse({ status: 200, description: 'Newly awarded badges' })
  async checkAndAwardBadges(@Param('userId') userId: string) {
    return this.badgesService.checkAndAwardBadges(userId);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get all badges for a user' })
  @ApiResponse({ status: 200, description: 'List of user badges' })
  async getUserBadges(@Param('userId') userId: string) {
    return this.badgesService.getUserBadges(userId);
  }
}
