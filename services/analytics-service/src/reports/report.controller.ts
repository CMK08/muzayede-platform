import { Controller, Get, Query, Param, BadRequestException } from '@nestjs/common';
import { ReportService } from './report.service';

@Controller('reports')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get()
  async generateReport(
    @Query('type') type: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    if (!type) {
      throw new BadRequestException('Report type is required (revenue, auctions, users, commissions, sales)');
    }

    const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = to ? new Date(to) : new Date();

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      throw new BadRequestException('Invalid date format. Use ISO 8601 format.');
    }

    const report = await this.reportService.generateReport(type, fromDate, toDate);
    return { data: report };
  }

  @Get('auction/:auctionId')
  async getAuctionPerformance(@Param('auctionId') auctionId: string) {
    const result = await this.reportService.getAuctionPerformance(auctionId);
    return { data: result };
  }

  @Get('types')
  getAvailableReportTypes() {
    return {
      data: [
        { type: 'revenue', label: 'Gelir Raporu', description: 'Günlük gelir, kategori ve satıcı bazlı gelir analizi' },
        { type: 'auctions', label: 'Müzayede Raporu', description: 'Müzayede istatistikleri, tür ve durum dağılımı' },
        { type: 'users', label: 'Kullanıcı Raporu', description: 'Kayıt, aktivite ve kullanıcı segmentasyonu' },
        { type: 'commissions', label: 'Komisyon Raporu', description: 'Alıcı ve satıcı komisyon detayları' },
        { type: 'sales', label: 'Satış Raporu', description: 'Günlük satışlar, en çok satan ürünler ve kategoriler' },
      ],
    };
  }
}
