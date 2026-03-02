import {
  Controller,
  Post,
  Get,
  Body,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CarrierService, Dimensions, PackageRateRequest } from './carrier.service';

@ApiTags('shipping')
@ApiBearerAuth()
@Controller('shipping')
export class CarrierController {
  constructor(private readonly carrierService: CarrierService) {}

  @Post('rates')
  @ApiOperation({ summary: 'Calculate shipping rates from all carriers' })
  @ApiResponse({
    status: 200,
    description: 'Returns rate quotes from all available carriers sorted by price',
  })
  async calculateRates(
    @Body()
    body: {
      weight: number;
      dimensions: Dimensions;
      origin: string;
      destination: string;
      declaredValue?: number;
      carrier?: string;
    },
  ) {
    if (body.carrier) {
      // Single carrier rate
      return this.carrierService.calculateRate(
        body.weight,
        body.dimensions,
        body.origin,
        body.destination,
        body.carrier,
      );
    }

    // All carrier rates
    const packageInfo: PackageRateRequest = {
      weight: body.weight,
      dimensions: body.dimensions,
      declaredValue: body.declaredValue,
    };

    return this.carrierService.getCarrierRates(
      packageInfo,
      body.origin,
      body.destination,
    );
  }

  @Post('labels')
  @ApiOperation({ summary: 'Generate a shipping label for a shipment' })
  @ApiResponse({ status: 201, description: 'Shipping label generated' })
  @ApiResponse({ status: 404, description: 'Shipment not found' })
  async generateLabel(
    @Body() body: { shipmentId: string },
  ) {
    return this.carrierService.generateLabel(body.shipmentId);
  }

  @Get('carriers')
  @ApiOperation({ summary: 'List all available shipping carriers' })
  @ApiResponse({
    status: 200,
    description: 'Returns list of available carriers with their details',
  })
  async listCarriers() {
    return this.carrierService.getAllCarriers();
  }
}
