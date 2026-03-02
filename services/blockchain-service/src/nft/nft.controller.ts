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
@Controller('blockchain/nft')
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

  @Post('lock')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lock an NFT for an active auction' })
  @ApiResponse({ status: 200, description: 'NFT locked for auction' })
  async lockForAuction(
    @Body() body: { tokenId: string; auctionId: string },
  ) {
    return this.nftService.lockForAuction(body.tokenId, body.auctionId);
  }

  @Post('unlock')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unlock an NFT after auction ends' })
  @ApiResponse({ status: 200, description: 'NFT unlocked from auction' })
  async unlockFromAuction(
    @Body() body: { tokenId: string },
  ) {
    return this.nftService.unlockFromAuction(body.tokenId);
  }

  @Get(':tokenId')
  @ApiOperation({ summary: 'Get NFT metadata and details by token ID' })
  @ApiResponse({ status: 200, description: 'NFT details returned' })
  async getTokenDetails(@Param('tokenId') tokenId: string) {
    return this.nftService.getTokenDetails(tokenId);
  }

  @Get('product/:productId')
  @ApiOperation({ summary: 'Get NFT certificate by product ID' })
  @ApiResponse({ status: 200, description: 'NFT certificate for the product' })
  async getCertificateByProduct(@Param('productId') productId: string) {
    return this.nftService.getCertificateByProduct(productId);
  }

  @Get('verify/:certificateId')
  @ApiOperation({ summary: 'Verify an NFT certificate on-chain' })
  @ApiResponse({ status: 200, description: 'Certificate verification result' })
  async verifyCertificate(@Param('certificateId') certificateId: string) {
    return this.nftService.verifyCertificate(certificateId);
  }
}
