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
import { PaymentService } from './payment.service';
import { EscrowService } from '../escrow/escrow.service';
import { InvoiceService } from '../invoice/invoice.service';

@ApiTags('payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly escrowService: EscrowService,
    private readonly invoiceService: InvoiceService,
  ) {}

  @Post('initiate')
  @ApiOperation({ summary: 'Initiate a payment for an auction win' })
  @ApiResponse({
    status: 201,
    description: 'Payment initiated, returns payment form URL or bank details',
  })
  async initiatePayment(
    @Body()
    body: {
      auctionId: string;
      bidId: string;
      buyerId: string;
      method: 'CREDIT_CARD' | 'BANK_TRANSFER' | 'ESCROW';
      ip?: string;
    },
  ) {
    return this.paymentService.initiatePayment(body);
  }

  @Post('callback')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Payment provider callback (iyzico webhook)' })
  async handleCallback(@Body() body: { token: string }) {
    return this.paymentService.handleCallback(body);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payment details with relations' })
  @ApiResponse({ status: 200, description: 'Returns payment details' })
  async getPayment(@Param('id') id: string) {
    return this.paymentService.getPayment(id);
  }

  @Get('order/:orderId')
  @ApiOperation({ summary: 'Get payments for an order' })
  async getPaymentsByOrder(@Param('orderId') orderId: string) {
    return this.paymentService.getPaymentsByOrder(orderId);
  }

  @Get('auction/:auctionId')
  @ApiOperation({ summary: 'Get payments for an auction' })
  async getPaymentByAuction(@Param('auctionId') auctionId: string) {
    return this.paymentService.getPaymentByAuction(auctionId);
  }

  @Post(':id/refund')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Initiate a refund' })
  async refund(
    @Param('id') id: string,
    @Body() body: { reason: string },
  ) {
    return this.paymentService.refund(id, body.reason);
  }

  @Post('escrow/:id/release')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Release escrow funds to seller' })
  async releaseEscrow(@Param('id') escrowId: string) {
    return this.paymentService.releaseEscrow(escrowId);
  }

  @Post('escrow/:id/dispute')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Dispute an escrow payment' })
  async disputeEscrow(
    @Param('id') escrowId: string,
    @Body() body: { reason: string },
  ) {
    return this.escrowService.handleDispute(escrowId, body.reason);
  }

  @Get('seller/:sellerId/payouts')
  @ApiOperation({ summary: 'Get seller payout history (paginated)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getSellerPayouts(
    @Param('sellerId') sellerId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.paymentService.getSellerPayouts(sellerId, page, limit);
  }

  @Post('payouts/process')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Process pending payouts past scheduled date' })
  async processPayouts() {
    return this.paymentService.processPayouts();
  }

  @Get(':id/invoice')
  @ApiOperation({ summary: 'Get or generate invoice for a payment' })
  async getInvoice(@Param('id') paymentId: string) {
    return this.paymentService.getInvoice(paymentId);
  }

  @Post('invoice/:orderId/generate')
  @ApiOperation({ summary: 'Generate invoice for an order' })
  async generateInvoice(@Param('orderId') orderId: string) {
    return this.invoiceService.generateInvoice(orderId);
  }

  @Get('invoice/:id/details')
  @ApiOperation({ summary: 'Get invoice by ID' })
  async getInvoiceDetails(@Param('id') id: string) {
    return this.invoiceService.getInvoice(id);
  }
}
