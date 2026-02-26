import {
  Controller,
  Post,
  Get,
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
import { NotificationService } from './notification.service';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post('send')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Send a notification via specified channels' })
  @ApiResponse({ status: 202, description: 'Notification queued for delivery' })
  async send(
    @Body()
    body: {
      userId: string;
      type: string;
      channels: ('email' | 'sms' | 'push' | 'in_app')[];
      data: Record<string, any>;
    },
  ) {
    return this.notificationService.send(
      body.userId,
      body.type,
      body.channels,
      body.data,
    );
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get notification history for a user' })
  @ApiParam({ name: 'userId', type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'unreadOnly', required: false, type: Boolean })
  @ApiQuery({ name: 'type', required: false, type: String })
  @ApiQuery({ name: 'channel', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Returns notification history' })
  async getUserNotifications(
    @Param('userId') userId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('unreadOnly') unreadOnly = false,
    @Query('type') type?: string,
    @Query('channel') channel?: string,
  ) {
    return this.notificationService.getUserNotifications(userId, {
      page,
      limit,
      unreadOnly,
      type,
      channel,
    });
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  async markAsRead(
    @Param('id') id: string,
    @Headers('x-user-id') userId: string,
  ) {
    return this.notificationService.markAsRead(id, userId);
  }

  @Post('user/:userId/read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read for a user' })
  @ApiParam({ name: 'userId', type: String })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  async markAllAsRead(@Param('userId') userId: string) {
    return this.notificationService.markAllAsRead(userId);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count for the current user' })
  @ApiResponse({ status: 200, description: 'Returns unread count' })
  async getUnreadCount(@Headers('x-user-id') userId: string) {
    return this.notificationService.getUnreadCount(userId);
  }

  @Post('preferences')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Set notification preferences for a notification type' })
  @ApiResponse({ status: 200, description: 'Preferences updated' })
  async setPreferences(
    @Headers('x-user-id') userId: string,
    @Body()
    body: {
      type: string;
      emailEnabled?: boolean;
      smsEnabled?: boolean;
      pushEnabled?: boolean;
    },
  ) {
    return this.notificationService.setPreferences(userId, body.type, {
      emailEnabled: body.emailEnabled,
      smsEnabled: body.smsEnabled,
      pushEnabled: body.pushEnabled,
    });
  }

  @Get('preferences')
  @ApiOperation({ summary: 'Get notification preferences for the current user' })
  @ApiResponse({ status: 200, description: 'Returns user notification preferences' })
  async getPreferences(@Headers('x-user-id') userId: string) {
    return this.notificationService.getPreferences(userId);
  }
}
