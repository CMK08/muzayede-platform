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
import { InvoiceService } from './invoice.service';

// ----------------------------------------------------------------
// DTOs
// ----------------------------------------------------------------

class GenerateInvoiceDto {
  orderId: string;
}

// ----------------------------------------------------------------
// Controller
// ----------------------------------------------------------------

@ApiTags('payments')
@ApiBearerAuth()
@Controller('payments/invoices')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Post('generate')
  @ApiOperation({ summary: 'Generate an e-invoice or e-archive for an order' })
  @ApiResponse({
    status: 201,
    description: 'Invoice generated successfully',
  })
  async generateInvoice(@Body() dto: GenerateInvoiceDto) {
    return this.invoiceService.generateInvoice(dto.orderId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get invoice details by ID' })
  @ApiResponse({ status: 200, description: 'Invoice details returned' })
  async getInvoice(@Param('id') id: string) {
    return this.invoiceService.getInvoice(id);
  }

  @Post(':id/send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send invoice to buyer via email' })
  @ApiResponse({ status: 200, description: 'Invoice email sent' })
  async sendInvoiceEmail(@Param('id') id: string) {
    return this.invoiceService.sendInvoiceEmail(id);
  }
}
