import { Controller, Get, Post, Body, Query, Param } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { ReportService } from '../reports/report.service';

@ApiTags('analytics')
@ApiBearerAuth()
@Controller('analytics')
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly reportService: ReportService,
  ) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get platform dashboard metrics' })
  @ApiQuery({
    name: 'period',
    required: false,
    enum: ['day', '24h', 'week', '7d', 'month', '30d', '90d', 'year', '1y'],
  })
  @ApiResponse({ status: 200, description: 'Returns dashboard metrics' })
  async getDashboard(@Query('period') period = '30d') {
    return this.analyticsService.getDashboardMetrics(period);
  }

  @Get('revenue-chart')
  @ApiOperation({ summary: 'Get revenue chart data' })
  @ApiQuery({ name: 'period', required: false, type: String })
  @ApiQuery({ name: 'granularity', required: false, enum: ['day', 'week', 'month'] })
  async getRevenueChart(
    @Query('period') period = '30d',
    @Query('granularity') granularity: 'day' | 'week' | 'month' = 'day',
  ) {
    return this.analyticsService.getRevenueChart(period, granularity);
  }

  @Get('category-performance')
  @ApiOperation({ summary: 'Get category performance analytics' })
  @ApiQuery({ name: 'period', required: false, type: String })
  async getCategoryPerformance(@Query('period') period = '30d') {
    return this.analyticsService.getCategoryPerformance(period);
  }

  @Get('top-sellers')
  @ApiOperation({ summary: 'Get top performing sellers' })
  @ApiQuery({ name: 'period', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getTopSellers(
    @Query('period') period = '30d',
    @Query('limit') limit = 10,
  ) {
    return this.analyticsService.getTopSellers(period, limit);
  }

  @Get('top-buyers')
  @ApiOperation({ summary: 'Get top buyers by spending' })
  @ApiQuery({ name: 'period', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getTopBuyers(
    @Query('period') period = '30d',
    @Query('limit') limit = 10,
  ) {
    return this.analyticsService.getTopBuyers(period, limit);
  }

  @Get('auctions')
  @ApiOperation({ summary: 'Get auction analytics' })
  @ApiQuery({ name: 'period', required: false, type: String })
  @ApiQuery({ name: 'categoryId', required: false, type: String })
  async getAuctionAnalytics(
    @Query('period') period = '30d',
    @Query('categoryId') categoryId?: string,
  ) {
    return this.analyticsService.getAuctionAnalytics(period, categoryId);
  }

  @Get('revenue')
  @ApiOperation({ summary: 'Get revenue analytics' })
  @ApiQuery({ name: 'period', required: false, type: String })
  async getRevenueAnalytics(@Query('period') period = '30d') {
    return this.analyticsService.getRevenueAnalytics(period);
  }

  @Get('users')
  @ApiOperation({ summary: 'Get user analytics' })
  @ApiQuery({ name: 'period', required: false, type: String })
  async getUserAnalytics(@Query('period') period = '30d') {
    return this.analyticsService.getUserAnalytics(period);
  }

  @Get('user-activity/:userId')
  @ApiOperation({ summary: 'Get activity timeline for a specific user' })
  @ApiQuery({ name: 'period', required: false, type: String })
  async getUserActivity(
    @Param('userId') userId: string,
    @Query('period') period = '30d',
  ) {
    return this.analyticsService.getUserActivity(userId, period);
  }

  @Post('events')
  @ApiOperation({ summary: 'Track an analytics event' })
  async trackEvent(
    @Body()
    body: {
      eventType: string;
      userId?: string;
      properties: Record<string, any>;
    },
  ) {
    return this.analyticsService.trackEvent(
      body.eventType,
      body.userId,
      body.properties,
    );
  }

  @Get('reports')
  @ApiOperation({ summary: 'Generate a report' })
  @ApiQuery({
    name: 'type',
    required: true,
    enum: ['sales', 'users', 'auctions', 'revenue', 'commissions'],
  })
  @ApiQuery({ name: 'from', required: true, type: String })
  @ApiQuery({ name: 'to', required: true, type: String })
  async generateReport(
    @Query('type') type: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.reportService.generateReport(type, new Date(from), new Date(to));
  }

  @Get('auction-performance/:auctionId')
  @ApiOperation({ summary: 'Get detailed performance metrics for a specific auction' })
  async getAuctionPerformance(@Param('auctionId') auctionId: string) {
    return this.reportService.getAuctionPerformance(auctionId);
  }
}
