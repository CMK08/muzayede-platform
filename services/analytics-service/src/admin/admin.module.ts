import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { ReportService } from '../reports/report.service';

@Module({
  controllers: [AdminController],
  providers: [AdminService, AnalyticsService, ReportService],
})
export class AdminModule {}
