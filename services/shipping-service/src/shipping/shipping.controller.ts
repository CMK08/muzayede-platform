import {
  Controller,
  Post,
  Get,
  Put,
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
import { ShippingService } from './shipping.service';
import { LabelService } from '../label/label.service';

@ApiTags('shipping')
@ApiBearerAuth()
@Controller('shipping')
export class ShippingController {
  constructor(
    private readonly shippingService: ShippingService,
    private readonly labelService: LabelService,
  ) {}

  @Post('orders')
  @ApiOperation({ summary: 'Create a shipping order for a paid auction item' })
  @ApiResponse({ status: 201, description: 'Shipping order created' })
  async createShippingOrder(
    @Body()
    body: {
      orderId: string;
      carrier: 'UPS' | 'WHITE_GLOVE' | 'SELF_PICKUP' | 'STORE_PICKUP';
      weight: number;
      dimensions: string;
      insuranceAmount?: number;
      recipientName: string;
      deliveryAddress: string;
    },
  ) {
    return this.shippingService.createOrder(body);
  }

  @Get('orders/:id')
  @ApiOperation({ summary: 'Get shipping order details' })
  @ApiResponse({ status: 200, description: 'Returns shipping order details' })
  async getOrder(@Param('id') id: string) {
    return this.shippingService.getOrder(id);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get shipments by user (buyer or seller)' })
  @ApiQuery({ name: 'role', required: false, enum: ['buyer', 'seller'] })
  async getOrdersByUser(
    @Param('userId') userId: string,
    @Query('role') role: 'buyer' | 'seller' = 'buyer',
  ) {
    return this.shippingService.getOrdersByUser(userId, role);
  }

  @Get('orders/:id/track')
  @ApiOperation({ summary: 'Track a shipment with full timeline' })
  @ApiResponse({ status: 200, description: 'Returns tracking information' })
  async trackShipment(@Param('id') id: string) {
    return this.shippingService.track(id);
  }

  @Get('rates')
  @ApiOperation({ summary: 'Get shipping rate quotes from all carriers' })
  @ApiQuery({ name: 'fromCity', required: true, type: String })
  @ApiQuery({ name: 'toCity', required: true, type: String })
  @ApiQuery({ name: 'weight', required: true, type: Number })
  @ApiQuery({ name: 'declaredValue', required: false, type: Number })
  @ApiQuery({ name: 'whiteGlove', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Returns available shipping rates sorted by price' })
  async getRates(
    @Query('fromCity') fromCity: string,
    @Query('toCity') toCity: string,
    @Query('weight') weight: number,
    @Query('declaredValue') declaredValue?: number,
    @Query('whiteGlove') whiteGlove?: boolean,
  ) {
    return this.shippingService.getRates({
      fromCity,
      toCity,
      weight,
      declaredValue,
      whiteGlove,
    });
  }

  @Put('orders/:id/status')
  @ApiOperation({ summary: 'Update shipping order status' })
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string; location?: string; note?: string },
  ) {
    return this.shippingService.updateStatus(
      id,
      body.status,
      body.location,
      body.note,
    );
  }

  @Post('orders/:id/confirm-delivery')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm delivery of a shipment (buyer only)' })
  async confirmDelivery(
    @Param('id') id: string,
    @Body() body: { userId: string; photoUrl?: string },
  ) {
    return this.shippingService.confirmDelivery(id, body.userId, body.photoUrl);
  }

  @Post('orders/:id/label')
  @ApiOperation({ summary: 'Generate shipping label with barcode' })
  @ApiResponse({ status: 201, description: 'Shipping label generated' })
  async generateLabel(@Param('id') shipmentId: string) {
    return this.labelService.generateLabel(shipmentId);
  }
}
