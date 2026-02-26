import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { ReportService } from '../reports/report.service';

@Module({
  controllers: [AnalyticsController],
  providers: [AnalyticsService, ReportService],
  exports: [AnalyticsService, ReportService],
})
export class AnalyticsModule {}
