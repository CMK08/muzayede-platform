// ---------------------------------------------------------------------------
// Analytics API Endpoints
// ---------------------------------------------------------------------------

import type { ApiResponse } from '@muzayede/shared-types';
import { BaseApiClient } from '../client';

export type DateRange = 'today' | '7d' | '30d' | '90d' | '12m' | 'ytd' | 'all' | 'custom';

export type ReportType =
  | 'sales'
  | 'revenue'
  | 'users'
  | 'auctions'
  | 'bids'
  | 'products'
  | 'payments'
  | 'shipping';

export type ExportFormat = 'csv' | 'xlsx' | 'pdf';

export interface DashboardMetricsParams {
  dateRange?: DateRange;
  fromDate?: string;
  toDate?: string;
}

export interface DashboardMetrics {
  totalRevenue: { amount: number; currency: string; change: number };
  totalAuctions: { count: number; change: number };
  totalBids: { count: number; change: number };
  activeUsers: { count: number; change: number };
  averageBidAmount: { amount: number; currency: string; change: number };
  conversionRate: { rate: number; change: number };
  topCategories: Array<{ categoryId: string; name: string; revenue: number; count: number }>;
  recentActivity: Array<{
    type: 'bid' | 'auction' | 'payment' | 'user';
    description: string;
    timestamp: string;
  }>;
}

export interface RevenueChartParams {
  dateRange?: DateRange;
  fromDate?: string;
  toDate?: string;
  granularity?: 'hour' | 'day' | 'week' | 'month';
  currency?: string;
}

export interface RevenueChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    currency: string;
  }>;
  total: { amount: number; currency: string };
}

export interface ReportParams {
  type: ReportType;
  dateRange?: DateRange;
  fromDate?: string;
  toDate?: string;
  groupBy?: string;
  filters?: Record<string, unknown>;
}

export interface Report {
  id: string;
  type: ReportType;
  title: string;
  generatedAt: string;
  dateRange: { from: string; to: string };
  summary: Record<string, unknown>;
  rows: Array<Record<string, unknown>>;
}

export interface ExportParams {
  type: ReportType;
  format: ExportFormat;
  dateRange?: DateRange;
  fromDate?: string;
  toDate?: string;
  filters?: Record<string, unknown>;
  columns?: string[];
}

export interface SellerAnalytics {
  totalSales: { amount: number; currency: string };
  totalItems: number;
  soldItems: number;
  averagePrice: { amount: number; currency: string };
  topProducts: Array<{ productId: string; title: string; revenue: number }>;
  revenueByMonth: Array<{ month: string; revenue: number }>;
  bidActivity: Array<{ date: string; bids: number }>;
  buyerDemographics: {
    countries: Array<{ country: string; count: number }>;
    returningBuyers: number;
  };
}

export interface BuyerAnalytics {
  totalSpent: { amount: number; currency: string };
  auctionsWon: number;
  auctionsParticipated: number;
  averageBid: { amount: number; currency: string };
  winRate: number;
  bidsByCategory: Array<{ categoryId: string; name: string; count: number }>;
  spendingByMonth: Array<{ month: string; spent: number }>;
}

export class AnalyticsApi extends BaseApiClient {
  /**
   * Get dashboard metrics (admin).
   */
  async getDashboard(
    params?: DashboardMetricsParams,
  ): Promise<ApiResponse<DashboardMetrics>> {
    return this.get<DashboardMetrics>('/analytics/dashboard', { params });
  }

  /**
   * Get revenue chart data (admin).
   */
  async getRevenueChart(
    params?: RevenueChartParams,
  ): Promise<ApiResponse<RevenueChartData>> {
    return this.get<RevenueChartData>('/analytics/revenue-chart', { params });
  }

  /**
   * Get auction performance metrics (admin).
   */
  async getAuctionMetrics(
    params?: DashboardMetricsParams,
  ): Promise<
    ApiResponse<{
      totalAuctions: number;
      completedAuctions: number;
      cancelledAuctions: number;
      averageBidsPerAuction: number;
      averageFinalPrice: { amount: number; currency: string };
      sellThroughRate: number;
    }>
  > {
    return this.get('/analytics/auctions', { params });
  }

  /**
   * Get user growth and activity metrics (admin).
   */
  async getUserMetrics(
    params?: DashboardMetricsParams,
  ): Promise<
    ApiResponse<{
      totalUsers: number;
      newUsers: number;
      activeUsers: number;
      verifiedUsers: number;
      usersByRole: Array<{ role: string; count: number }>;
      registrationsByDay: Array<{ date: string; count: number }>;
    }>
  > {
    return this.get('/analytics/users', { params });
  }

  /**
   * Generate a report.
   */
  async generateReport(params: ReportParams): Promise<ApiResponse<Report>> {
    return this.post<Report>('/analytics/reports', params);
  }

  /**
   * List previously generated reports.
   */
  async listReports(
    params?: { page?: number; perPage?: number; type?: ReportType },
  ): Promise<ApiResponse<Report[]>> {
    return this.get<Report[]>('/analytics/reports', { params });
  }

  /**
   * Get a specific report by ID.
   */
  async getReport(id: string): Promise<ApiResponse<Report>> {
    return this.get<Report>(`/analytics/reports/${id}`);
  }

  /**
   * Delete a generated report.
   */
  async deleteReport(id: string): Promise<ApiResponse<{ message: string }>> {
    return this.delete<{ message: string }>(`/analytics/reports/${id}`);
  }

  /**
   * Export data in the specified format (CSV, XLSX, PDF).
   */
  async exportData(
    params: ExportParams,
  ): Promise<ApiResponse<{ downloadUrl: string; expiresAt: string }>> {
    return this.post<{ downloadUrl: string; expiresAt: string }>(
      '/analytics/export',
      params,
    );
  }

  /**
   * Get the status of an export job.
   */
  async getExportStatus(
    jobId: string,
  ): Promise<
    ApiResponse<{
      jobId: string;
      status: 'pending' | 'processing' | 'completed' | 'failed';
      downloadUrl?: string;
      expiresAt?: string;
      error?: string;
    }>
  > {
    return this.get(`/analytics/export/${jobId}`);
  }

  // -- Seller/Buyer analytics (non-admin) ---------------------------------

  /**
   * Get analytics for the current user as a seller.
   */
  async getSellerAnalytics(
    params?: DashboardMetricsParams,
  ): Promise<ApiResponse<SellerAnalytics>> {
    return this.get<SellerAnalytics>('/analytics/seller', { params });
  }

  /**
   * Get analytics for the current user as a buyer.
   */
  async getBuyerAnalytics(
    params?: DashboardMetricsParams,
  ): Promise<ApiResponse<BuyerAnalytics>> {
    return this.get<BuyerAnalytics>('/analytics/buyer', { params });
  }
}
