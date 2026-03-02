import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { EscrowService } from './escrow.service';

// ----------------------------------------------------------------
// DTOs
// ----------------------------------------------------------------

class CreateEscrowDto {
  orderId: string;
  buyerId: string;
  sellerId: string;
  amount: number;
}

class RefundEscrowDto {
  reason: string;
}

// ----------------------------------------------------------------
// Controller
// ----------------------------------------------------------------

@ApiTags('payments')
@ApiBearerAuth()
@Controller('payments/escrow')
export class EscrowController {
  constructor(private readonly escrowService: EscrowService) {}

  @Post()
  @ApiOperation({ summary: 'Create an escrow hold for an order' })
  @ApiResponse({ status: 201, description: 'Escrow created successfully' })
  async createEscrow(@Body() dto: CreateEscrowDto) {
    return this.escrowService.createEscrow(dto.orderId, dto.amount);
  }

  @Post(':id/release')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Release escrow funds to seller' })
  @ApiResponse({ status: 200, description: 'Escrow funds released' })
  async releaseEscrow(@Param('id') id: string) {
    return this.escrowService.releaseEscrow(id);
  }

  @Post(':id/refund')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refund escrow to buyer' })
  @ApiResponse({ status: 200, description: 'Escrow refunded to buyer' })
  async refundEscrow(
    @Param('id') id: string,
    @Body() body: RefundEscrowDto,
  ) {
    return this.escrowService.handleDispute(id, body.reason);
  }

  @Get(':orderId')
  @ApiOperation({ summary: 'Get escrow status for an order' })
  @ApiResponse({ status: 200, description: 'Escrow status returned' })
  async getEscrowStatus(@Param('orderId') orderId: string) {
    return this.escrowService.getEscrowStatus(orderId);
  }
}
