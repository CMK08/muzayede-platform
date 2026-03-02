import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { FractionalService } from './fractional.service';

@ApiTags('fractional')
@ApiBearerAuth()
@Controller('blockchain/fractional')
export class FractionalController {
  constructor(private readonly fractionalService: FractionalService) {}

  @Post('create')
  @ApiOperation({ summary: 'Create a fractional offering for a product' })
  @ApiResponse({ status: 201, description: 'Fractional offering created' })
  async createFractionalToken(
    @Body() body: { productId: string; totalShares: number; pricePerShare: number },
  ) {
    return this.fractionalService.createFractionalToken(
      body.productId,
      body.totalShares,
      body.pricePerShare,
    );
  }

  @Post('buy')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Buy fractional shares' })
  @ApiResponse({ status: 200, description: 'Shares purchased successfully' })
  async buyShares(
    @Body() body: { tokenId: string; userId: string; quantity: number },
  ) {
    return this.fractionalService.buyShares(body.tokenId, body.userId, body.quantity);
  }

  @Get(':productId')
  @ApiOperation({ summary: 'Get fractional offering details by product ID' })
  @ApiResponse({ status: 200, description: 'Fractional offering details' })
  async getFractionalByProduct(@Param('productId') productId: string) {
    return this.fractionalService.getFractionalByProduct(productId);
  }

  @Get('shareholders/:tokenId')
  @ApiOperation({ summary: 'Get shareholders for a fractional token' })
  @ApiResponse({ status: 200, description: 'List of shareholders' })
  async getShareholders(@Param('tokenId') tokenId: string) {
    return this.fractionalService.getShareholders(tokenId);
  }

  @Get('info/:tokenId')
  @ApiOperation({ summary: 'Get fractional token details by token ID' })
  @ApiResponse({ status: 200, description: 'Token details with availability' })
  async getTokenInfo(@Param('tokenId') tokenId: string) {
    return this.fractionalService.getTokenInfo(tokenId);
  }
}
