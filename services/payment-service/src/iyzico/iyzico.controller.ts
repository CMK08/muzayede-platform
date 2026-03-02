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
import {
  IyzicoService,
  CardDetails,
  BuyerInfo,
  BasketItem,
  SubMerchantInfo,
} from './iyzico.service';

// ----------------------------------------------------------------
// DTOs
// ----------------------------------------------------------------

class ProcessPaymentDto {
  amount: number;
  currency: string;
  cardDetails: CardDetails;
  buyerInfo: BuyerInfo;
  basketItems: BasketItem[];
}

class Init3DSecureDto {
  amount: number;
  currency: string;
  cardDetails: CardDetails;
  buyerInfo: BuyerInfo;
  basketItems: BasketItem[];
}

class ThreeDCallbackDto {
  paymentId: string;
  conversationId?: string;
  mdStatus?: string;
  status?: string;
}

class RefundDto {
  reason?: string;
}

// ----------------------------------------------------------------
// Controller
// ----------------------------------------------------------------

@ApiTags('payments')
@ApiBearerAuth()
@Controller('payments')
export class IyzicoController {
  constructor(private readonly iyzicoService: IyzicoService) {}

  @Post('process')
  @ApiOperation({ summary: 'Process a credit card payment via iyzico' })
  @ApiResponse({
    status: 201,
    description: 'Payment processed successfully',
  })
  @ApiResponse({ status: 400, description: 'Payment processing failed' })
  async processPayment(@Body() dto: ProcessPaymentDto) {
    const result = await this.iyzicoService.createPayment(
      dto.amount,
      dto.currency,
      dto.cardDetails,
      dto.buyerInfo,
      dto.basketItems,
    );
    return result;
  }

  @Post('3d-init')
  @ApiOperation({ summary: 'Initiate 3D Secure payment' })
  @ApiResponse({
    status: 201,
    description: '3D Secure payment initiated, returns HTML content for redirect',
  })
  async init3DSecure(@Body() dto: Init3DSecureDto) {
    const result = await this.iyzicoService.create3DSecurePayment(
      dto.amount,
      dto.currency,
      dto.cardDetails,
      dto.buyerInfo,
      dto.basketItems,
    );
    return result;
  }

  @Post('3d-callback')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '3D Secure callback handler' })
  @ApiResponse({
    status: 200,
    description: '3D Secure payment verified',
  })
  async threeDCallback(@Body() body: ThreeDCallbackDto) {
    if (body.paymentId) {
      const paymentDetails = await this.iyzicoService.retrievePayment(
        body.paymentId,
      );
      return {
        status: paymentDetails?.status || 'failure',
        paymentId: body.paymentId,
        conversationId: body.conversationId,
        paymentDetails,
      };
    }
    return {
      status: 'failure',
      message: 'No paymentId provided in 3D callback',
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve payment details from iyzico' })
  @ApiResponse({ status: 200, description: 'Payment details returned' })
  async getPayment(@Param('id') id: string) {
    const result = await this.iyzicoService.retrievePayment(id);
    if (!result) {
      return { status: 'not_found', paymentId: id };
    }
    return result;
  }

  @Post(':id/refund')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refund / cancel a payment' })
  @ApiResponse({ status: 200, description: 'Refund processed' })
  async refundPayment(
    @Param('id') id: string,
    @Body() body: RefundDto,
  ) {
    const result = await this.iyzicoService.cancelPayment(id);
    return {
      ...result,
      reason: body.reason || 'Refund requested',
    };
  }

  @Get('installments')
  @ApiOperation({ summary: 'Get installment options for a card BIN' })
  @ApiQuery({ name: 'binNumber', required: true, type: String })
  @ApiQuery({ name: 'price', required: true, type: Number })
  @ApiResponse({ status: 200, description: 'Installment options returned' })
  async getInstallments(
    @Query('binNumber') binNumber: string,
    @Query('price') price: number,
  ) {
    const result = await this.iyzicoService.calculateInstallments(
      binNumber,
      price,
    );
    return result;
  }
}
