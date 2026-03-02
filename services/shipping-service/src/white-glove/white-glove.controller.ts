import {
  Controller,
  Post,
  Get,
  Body,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { WhiteGloveService } from './white-glove.service';

@ApiTags('shipping')
@ApiBearerAuth()
@Controller('shipping/white-glove')
export class WhiteGloveController {
  constructor(private readonly whiteGloveService: WhiteGloveService) {}

  @Post()
  @ApiOperation({ summary: 'Request white glove service for a shipment' })
  @ApiResponse({
    status: 201,
    description: 'White glove service requested successfully',
  })
  @ApiResponse({ status: 400, description: 'Cannot add white glove service' })
  @ApiResponse({ status: 404, description: 'Shipment not found' })
  async requestWhiteGlove(
    @Body()
    body: {
      shipmentId: string;
      specialInstructions: string;
    },
  ) {
    return this.whiteGloveService.requestWhiteGlove(
      body.shipmentId,
      body.specialInstructions,
    );
  }

  @Post(':id/pickup')
  @ApiOperation({ summary: 'Schedule pickup for a white glove shipment' })
  @ApiParam({ name: 'id', description: 'Shipment ID' })
  @ApiResponse({ status: 201, description: 'Pickup scheduled successfully' })
  @ApiResponse({ status: 400, description: 'Invalid date or not white glove' })
  @ApiResponse({ status: 404, description: 'Shipment not found' })
  async schedulePickup(
    @Param('id') id: string,
    @Body() body: { preferredDate: string },
  ) {
    return this.whiteGloveService.schedulePickup(id, body.preferredDate);
  }

  @Post(':id/delivery')
  @ApiOperation({ summary: 'Schedule delivery for a white glove shipment' })
  @ApiParam({ name: 'id', description: 'Shipment ID' })
  @ApiResponse({ status: 201, description: 'Delivery scheduled successfully' })
  @ApiResponse({ status: 400, description: 'Invalid date or not white glove' })
  @ApiResponse({ status: 404, description: 'Shipment not found' })
  async scheduleDelivery(
    @Param('id') id: string,
    @Body() body: { preferredDate: string },
  ) {
    return this.whiteGloveService.scheduleDelivery(id, body.preferredDate);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get white glove service status for a shipment' })
  @ApiParam({ name: 'id', description: 'Shipment ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns white glove service status including pickup and delivery schedules',
  })
  @ApiResponse({ status: 404, description: 'Shipment not found' })
  async getWhiteGloveStatus(@Param('id') id: string) {
    return this.whiteGloveService.getWhiteGloveStatus(id);
  }
}
