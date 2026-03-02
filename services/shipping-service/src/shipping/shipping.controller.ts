import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
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
  ApiParam,
} from '@nestjs/swagger';
import { ShippingService, AddressInfo, PackageInfo } from './shipping.service';

@ApiTags('shipping')
@ApiBearerAuth()
@Controller('shipping')
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new shipment' })
  @ApiResponse({ status: 201, description: 'Shipment created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async createShipment(
    @Body()
    body: {
      orderId: string;
      senderAddress: AddressInfo;
      receiverAddress: AddressInfo;
      packageInfo: PackageInfo;
    },
  ) {
    return this.shippingService.createShipment(
      body.orderId,
      body.senderAddress,
      body.receiverAddress,
      body.packageInfo,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get shipment by ID' })
  @ApiParam({ name: 'id', description: 'Shipment ID' })
  @ApiResponse({ status: 200, description: 'Returns shipment details' })
  @ApiResponse({ status: 404, description: 'Shipment not found' })
  async getShipment(@Param('id') id: string) {
    return this.shippingService.getShipmentStatus(id);
  }

  @Get('order/:orderId')
  @ApiOperation({ summary: 'Get shipment by order ID' })
  @ApiParam({ name: 'orderId', description: 'Order ID' })
  @ApiResponse({ status: 200, description: 'Returns shipment for the order' })
  @ApiResponse({ status: 404, description: 'Shipment not found' })
  async getShipmentByOrder(@Param('orderId') orderId: string) {
    return this.shippingService.getShipmentByOrder(orderId);
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Update shipment status' })
  @ApiParam({ name: 'id', description: 'Shipment ID' })
  @ApiResponse({ status: 200, description: 'Status updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({ status: 404, description: 'Shipment not found' })
  async updateShipmentStatus(
    @Param('id') id: string,
    @Body()
    body: {
      status: string;
      location?: string;
      description?: string;
    },
  ) {
    return this.shippingService.updateShipmentStatus(
      id,
      body.status,
      body.location,
      body.description,
    );
  }

  @Get(':id/tracking')
  @ApiOperation({ summary: 'Get tracking events for a shipment' })
  @ApiParam({ name: 'id', description: 'Shipment ID' })
  @ApiResponse({ status: 200, description: 'Returns tracking event history' })
  @ApiResponse({ status: 404, description: 'Shipment not found' })
  async getTrackingEvents(@Param('id') id: string) {
    return this.shippingService.getTrackingEvents(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a shipment' })
  @ApiParam({ name: 'id', description: 'Shipment ID' })
  @ApiResponse({ status: 200, description: 'Shipment cancelled successfully' })
  @ApiResponse({ status: 400, description: 'Shipment cannot be cancelled' })
  @ApiResponse({ status: 404, description: 'Shipment not found' })
  async cancelShipment(@Param('id') id: string) {
    return this.shippingService.cancelShipment(id);
  }
}
