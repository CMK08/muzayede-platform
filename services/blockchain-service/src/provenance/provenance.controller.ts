import {
  Controller,
  Get,
  Post,
  Body,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ProvenanceService } from './provenance.service';

@ApiTags('provenance')
@ApiBearerAuth()
@Controller('provenance')
export class ProvenanceController {
  constructor(private readonly provenanceService: ProvenanceService) {}

  @Post('record')
  @ApiOperation({ summary: 'Record a provenance event for a product' })
  @ApiResponse({ status: 201, description: 'Provenance event recorded' })
  async recordEvent(
    @Body()
    body: {
      productId: string;
      eventType: string;
      fromWallet?: string;
      toWallet?: string;
      price?: number;
      notes?: string;
    },
  ) {
    return this.provenanceService.recordEvent(body.productId, body.eventType, {
      fromWallet: body.fromWallet,
      toWallet: body.toWallet,
      price: body.price,
      notes: body.notes,
    });
  }

  @Get('chain/:productId')
  @ApiOperation({ summary: 'Get full provenance chain for a product' })
  @ApiResponse({ status: 200, description: 'Returns provenance timeline' })
  async getProvenanceChain(@Param('productId') productId: string) {
    return this.provenanceService.getProvenanceChain(productId);
  }

  @Get('verify/:recordId')
  @ApiOperation({ summary: 'Verify a provenance record against blockchain' })
  @ApiResponse({ status: 200, description: 'Verification result' })
  async verifyRecord(@Param('recordId') recordId: string) {
    return this.provenanceService.verifyRecord(recordId);
  }
}
