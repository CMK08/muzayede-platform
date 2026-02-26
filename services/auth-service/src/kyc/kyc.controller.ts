import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { KycService } from './kyc.service';
import { KycUploadDto } from './dto/kyc-upload.dto';
import { KycReviewDto } from './dto/kyc-review.dto';
import { JwtGuard } from '../guards/jwt.guard';
import { RolesGuard, Roles } from '../guards/roles.guard';

@ApiTags('kyc')
@Controller('auth/kyc')
@UseGuards(JwtGuard)
@ApiBearerAuth()
export class KycController {
  constructor(private readonly kycService: KycService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload a KYC document' })
  @ApiResponse({ status: 201, description: 'Document uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request or duplicate pending document' })
  async upload(@Req() req: any, @Body() dto: KycUploadDto) {
    return this.kycService.uploadDocument(req.user.sub, dto);
  }

  @Get('status')
  @ApiOperation({ summary: 'Get KYC status and documents for the current user' })
  @ApiResponse({ status: 200, description: 'Returns KYC status and document list' })
  async getStatus(@Req() req: any) {
    return this.kycService.getStatus(req.user.sub);
  }

  @Put(':id/review')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Review a KYC document (admin only)' })
  @ApiResponse({ status: 200, description: 'Document reviewed successfully' })
  @ApiResponse({ status: 400, description: 'Document already reviewed' })
  @ApiResponse({ status: 403, description: 'Only admins can review documents' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async review(
    @Param('id') id: string,
    @Req() req: any,
    @Body() dto: KycReviewDto,
  ) {
    return this.kycService.reviewDocument(id, req.user.sub, dto);
  }
}
