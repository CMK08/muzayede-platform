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
import { NftService } from './nft.service';

@ApiTags('nft')
@ApiBearerAuth()
@Controller('nft')
export class NftController {
  constructor(private readonly nftService: NftService) {}

  @Post('mint')
  @ApiOperation({ summary: 'Mint an NFT certificate for a product' })
  @ApiResponse({ status: 201, description: 'NFT certificate minted successfully' })
  async mintCertificate(
    @Body() body: { productId: string; ownerWallet: string },
  ) {
    return this.nftService.mintCertificate(body.productId, body.ownerWallet);
  }

  @Post('transfer')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Transfer an NFT certificate to a new owner' })
  @ApiResponse({ status: 200, description: 'NFT certificate transferred successfully' })
  async transferCertificate(
    @Body() body: { certificateId: string; fromWallet: string; toWallet: string },
  ) {
    return this.nftService.transferCertificate(
      body.certificateId,
      body.fromWallet,
      body.toWallet,
    );
  }

  @Get('verify/:certificateId')
  @ApiOperation({ summary: 'Verify an NFT certificate on-chain' })
  @ApiResponse({ status: 200, description: 'Certificate verification result' })
  async verifyCertificate(@Param('certificateId') certificateId: string) {
    return this.nftService.verifyCertificate(certificateId);
  }

  @Get('provenance/:productId')
  @ApiOperation({ summary: 'Get provenance chain for a product' })
  @ApiResponse({ status: 200, description: 'Provenance chain timeline' })
  async getProvenanceChain(@Param('productId') productId: string) {
    return this.nftService.getProvenanceChain(productId);
  }
}
