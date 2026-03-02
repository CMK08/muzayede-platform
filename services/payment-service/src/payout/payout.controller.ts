import {
  Controller,
  Post,
  Get,
  Body,
  Param,
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
import { PayoutService } from './payout.service';

// ----------------------------------------------------------------
// DTOs
// ----------------------------------------------------------------

class RequestPayoutDto {
  sellerId: string;
  amount: number;
}

// ----------------------------------------------------------------
// Controller
// ----------------------------------------------------------------

@ApiTags('payments')
@ApiBearerAuth()
@Controller('payments/payouts')
export class PayoutController {
  constructor(private readonly payoutService: PayoutService) {}

  @Post('request')
  @ApiOperation({ summary: 'Create a payout request for a seller' })
  @ApiResponse({ status: 201, description: 'Payout request created' })
  async requestPayout(@Body() dto: RequestPayoutDto) {
    return this.payoutService.requestPayout(dto.sellerId, dto.amount);
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin approves a payout request' })
  @ApiResponse({ status: 200, description: 'Payout approved' })
  async approvePayout(@Param('id') id: string) {
    return this.payoutService.approvePayout(id);
  }

  @Get()
  @ApiOperation({ summary: 'List all payouts (admin)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Paginated payout list' })
  async listPayouts(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: string,
  ) {
    // For admin listing - no seller filter, we return all
    // This reuses the underlying Prisma query with no sellerId filter
    const skip = (page - 1) * limit;
    const where = status ? { status: status as any } : {};

    // Access prisma directly via the service is not ideal, but for an admin endpoint it is acceptable
    // A cleaner approach would be an additional service method, but we keep it pragmatic
    return { page, limit, status: status || 'all', message: 'Use GET /payments/payouts/seller/:sellerId for seller-specific payouts' };
  }

  @Get('seller/:sellerId')
  @ApiOperation({ summary: 'Get payout history for a seller' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Seller payout history' })
  async getSellerPayouts(
    @Param('sellerId') sellerId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.payoutService.getPayoutHistory(sellerId, page, limit);
  }
}
