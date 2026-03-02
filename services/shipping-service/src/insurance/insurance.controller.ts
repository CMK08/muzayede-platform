import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { InsuranceService } from './insurance.service';

@ApiTags('shipping')
@ApiBearerAuth()
@Controller('shipping/insurance')
export class InsuranceController {
  constructor(private readonly insuranceService: InsuranceService) {}

  @Post('calculate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Calculate insurance premium for a declared value' })
  @ApiResponse({
    status: 200,
    description: 'Returns insurance premium calculation',
  })
  @ApiResponse({ status: 400, description: 'Invalid declared value' })
  async calculateInsurance(
    @Body()
    body: {
      declaredValue: number;
      carrier: string;
    },
  ) {
    return this.insuranceService.calculateInsurance(
      body.declaredValue,
      body.carrier,
    );
  }

  @Post()
  @ApiOperation({ summary: 'Add insurance to an existing shipment' })
  @ApiResponse({ status: 201, description: 'Insurance policy created' })
  @ApiResponse({ status: 400, description: 'Cannot add insurance' })
  @ApiResponse({ status: 404, description: 'Shipment not found' })
  async addInsurance(
    @Body()
    body: {
      shipmentId: string;
      declaredValue: number;
    },
  ) {
    return this.insuranceService.addInsurance(
      body.shipmentId,
      body.declaredValue,
    );
  }

  @Post('claim')
  @ApiOperation({ summary: 'File an insurance claim for a shipment' })
  @ApiResponse({ status: 201, description: 'Insurance claim filed' })
  @ApiResponse({ status: 400, description: 'Invalid claim or no insurance' })
  @ApiResponse({ status: 404, description: 'Shipment not found' })
  async fileClaim(
    @Body()
    body: {
      shipmentId: string;
      reason: string;
      evidence: string[];
    },
  ) {
    return this.insuranceService.fileClaim(
      body.shipmentId,
      body.reason,
      body.evidence,
    );
  }
}
