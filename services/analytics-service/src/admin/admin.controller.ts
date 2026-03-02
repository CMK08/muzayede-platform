import {
  Controller,
  Get,
  Put,
  Query,
  Body,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AnalyticsService } from '../analytics/analytics.service';
import { ReportService } from '../reports/report.service';
import { AdminService } from './admin.service';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin')
export class AdminController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly reportService: ReportService,
    private readonly adminService: AdminService,
  ) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get admin dashboard overview' })
  @ApiQuery({ name: 'period', required: false, type: String })
  async getDashboard(@Query('period') period = '30d') {
    const [metrics, recentAuctions, recentOrders, revenueChart] =
      await Promise.all([
        this.analyticsService.getDashboardMetrics(period),
        this.adminService.getRecentAuctions(10),
        this.adminService.getRecentOrders(10),
        this.analyticsService.getRevenueChart(period, 'day'),
      ]);

    return {
      data: {
        ...metrics.overview,
        recentAuctions,
        recentOrders,
        revenueChart: revenueChart.data,
      },
    };
  }

  @Get('users')
  @ApiOperation({ summary: 'List all users (admin)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'role', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  async getUsers(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('status') status?: string,
  ) {
    return this.adminService.getUsers(+page, +limit, { search, role, status });
  }

  @Get('auctions')
  @ApiOperation({ summary: 'List all auctions (admin)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'type', required: false, type: String })
  async getAuctions(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
  ) {
    return this.adminService.getAuctions(+page, +limit, { search, status, type });
  }

  @Get('products')
  @ApiOperation({ summary: 'List all products (admin)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'category', required: false, type: String })
  async getProducts(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('search') search?: string,
    @Query('category') category?: string,
  ) {
    return this.adminService.getProducts(+page, +limit, { search, category });
  }

  @Get('orders')
  @ApiOperation({ summary: 'List all orders (admin)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  async getOrders(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getOrders(+page, +limit, { status, search });
  }

  @Get('finance')
  @ApiOperation({ summary: 'Get financial overview' })
  @ApiQuery({ name: 'period', required: false, type: String })
  async getFinance(@Query('period') period = '30d') {
    const [revenue, commissions, payouts] = await Promise.all([
      this.analyticsService.getRevenueAnalytics(period),
      this.adminService.getCommissionSummary(period),
      this.adminService.getPayoutSummary(period),
    ]);

    return {
      data: {
        ...revenue,
        commissions,
        payouts,
      },
    };
  }

  @Get('cms')
  @ApiOperation({ summary: 'Get CMS overview for admin' })
  async getCms() {
    return {
      data: await this.adminService.getCmsOverview(),
    };
  }

  @Get('settings')
  @ApiOperation({ summary: 'Get platform settings' })
  async getSettings() {
    return {
      data: await this.adminService.getSettings(),
    };
  }

  @Put('settings')
  @ApiOperation({ summary: 'Update platform settings' })
  async updateSettings(@Body() payload: Record<string, unknown>) {
    return {
      data: await this.adminService.updateSettings(payload),
    };
  }

  @Get('reports')
  @ApiOperation({ summary: 'Generate admin report' })
  @ApiQuery({ name: 'type', required: true, type: String })
  @ApiQuery({ name: 'from', required: true, type: String })
  @ApiQuery({ name: 'to', required: true, type: String })
  async getReports(
    @Query('type') type: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.reportService.generateReport(type, new Date(from), new Date(to));
  }
}
