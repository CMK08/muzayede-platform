import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TwoFactorService } from './two-factor.service';
import { Verify2faDto } from '../auth/dto/verify-2fa.dto';
import { Enable2faDto } from '../auth/dto/enable-2fa.dto';
import { JwtGuard } from '../guards/jwt.guard';

@ApiTags('auth')
@Controller('auth/2fa')
@UseGuards(JwtGuard)
@ApiBearerAuth()
export class TwoFactorController {
  constructor(private readonly twoFactorService: TwoFactorService) {}

  @Post('generate')
  @ApiOperation({ summary: 'Generate a new TOTP secret for 2FA setup' })
  @ApiResponse({ status: 201, description: 'TOTP secret and QR code URL returned' })
  @ApiResponse({ status: 400, description: '2FA already enabled' })
  async generate(@Req() req: any) {
    return this.twoFactorService.generateSecret(req.user.sub);
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify a TOTP code (for testing purposes)' })
  @ApiResponse({ status: 200, description: 'Code verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid TOTP code' })
  async verify(@Req() req: any, @Body() dto: Verify2faDto) {
    const isValid = await this.twoFactorService.validateForUser(req.user.sub, dto.code);
    if (!isValid) {
      return { valid: false, message: 'Invalid TOTP code' };
    }
    return { valid: true, message: 'TOTP code is valid' };
  }

  @Post('enable')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enable 2FA for the current user' })
  @ApiResponse({ status: 200, description: '2FA enabled successfully' })
  @ApiResponse({ status: 400, description: 'Invalid TOTP code or already enabled' })
  async enable(@Req() req: any, @Body() dto: Enable2faDto) {
    return this.twoFactorService.enable(req.user.sub, dto.secret, dto.code);
  }

  @Post('disable')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disable 2FA for the current user' })
  @ApiResponse({ status: 200, description: '2FA disabled successfully' })
  @ApiResponse({ status: 400, description: 'Invalid TOTP code or not enabled' })
  async disable(@Req() req: any, @Body() dto: Verify2faDto) {
    return this.twoFactorService.disable(req.user.sub, dto.code);
  }
}
