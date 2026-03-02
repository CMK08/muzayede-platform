import {
  Controller,
  Post,
  Get,
  Put,
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
  ApiQuery,
} from '@nestjs/swagger';
import { CommissionService } from './commission.service';

// ----------------------------------------------------------------
// DTOs
// ----------------------------------------------------------------

class CalculateCommissionDto {
  auctionId: string;
  hammerPrice: number;
}

class SetCommissionRateDto {
  targetId: string;
  type: 'seller' | 'auction';
  rate: number;
}

// ----------------------------------------------------------------
// Controller
// ----------------------------------------------------------------

@ApiTags('payments')
@ApiBearerAuth()
@Controller('payments/commission')
export class CommissionController {
  constructor(private readonly commissionService: CommissionService) {}

  @Post('calculate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Calculate buyer and seller commissions' })
  @ApiResponse({
    status: 200,
    description: 'Commission breakdown returned',
  })
  async calculateCommission(@Body() dto: CalculateCommissionDto) {
    return this.commissionService.calculateCommission(
      dto.auctionId,
      dto.hammerPrice,
    );
  }

  @Get('rates')
  @ApiOperation({
    summary: 'Get commission rates (global, per-auction, or per-seller)',
  })
  @ApiQuery({ name: 'auctionId', required: false, type: String })
  @ApiQuery({ name: 'sellerId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Commission rates returned' })
  async getCommissionRates(
    @Query('auctionId') auctionId?: string,
    @Query('sellerId') sellerId?: string,
  ) {
    return this.commissionService.getCommissionRates(auctionId, sellerId);
  }

  @Put('rates')
  @ApiOperation({ summary: 'Set a custom commission rate for seller or auction' })
  @ApiResponse({
    status: 200,
    description: 'Commission rate updated',
  })
  async setCommissionRate(@Body() dto: SetCommissionRateDto) {
    return this.commissionService.setCommissionRate(
      dto.targetId,
      dto.type,
      dto.rate,
    );
  }
}
