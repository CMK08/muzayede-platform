import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

/**
 * TOTP (Time-based One-Time Password) implementation following RFC 6238.
 * Uses HMAC-SHA1 with a 30-second time step and 6-digit codes.
 */
@Injectable()
export class TwoFactorService {
  private readonly logger = new Logger(TwoFactorService.name);
  private readonly TOTP_STEP = 30; // seconds
  private readonly TOTP_DIGITS = 6;
  private readonly TOTP_WINDOW = 1; // allow 1 step before/after for clock drift
  private readonly ISSUER = 'MuzayedePlatform';

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate a new TOTP secret for the user.
   * Returns the secret and an otpauth:// URI for QR code generation.
   */
  async generateSecret(userId: string): Promise<{ secret: string; otpauthUrl: string; qrCodeUrl: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, twoFactorEnabled: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.twoFactorEnabled) {
      throw new BadRequestException('Two-factor authentication is already enabled');
    }

    // Generate a 20-byte random secret and encode as base32
    const secretBuffer = crypto.randomBytes(20);
    const secret = this.base32Encode(secretBuffer);

    const otpauthUrl = `otpauth://totp/${this.ISSUER}:${encodeURIComponent(user.email)}?secret=${secret}&issuer=${this.ISSUER}&algorithm=SHA1&digits=${this.TOTP_DIGITS}&period=${this.TOTP_STEP}`;

    // Generate a Google Charts QR code URL (publicly available, no auth needed)
    const qrCodeUrl = `https://chart.googleapis.com/chart?chs=200x200&chld=M|0&cht=qr&chl=${encodeURIComponent(otpauthUrl)}`;

    this.logger.log(`2FA secret generated for user ${userId}`);

    return { secret, otpauthUrl, qrCodeUrl };
  }

  /**
   * Verify a TOTP code against a given secret.
   */
  verifyCode(secret: string, code: string): boolean {
    if (!secret || !code || code.length !== this.TOTP_DIGITS) {
      return false;
    }

    const now = Math.floor(Date.now() / 1000);

    // Check codes within the time window to account for clock drift
    for (let i = -this.TOTP_WINDOW; i <= this.TOTP_WINDOW; i++) {
      const timeStep = Math.floor((now + i * this.TOTP_STEP) / this.TOTP_STEP);
      const expectedCode = this.generateTOTP(secret, timeStep);
      if (expectedCode === code) {
        return true;
      }
    }

    return false;
  }

  /**
   * Enable 2FA for a user after verifying the setup code.
   */
  async enable(userId: string, secret: string, code: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorEnabled: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.twoFactorEnabled) {
      throw new BadRequestException('Two-factor authentication is already enabled');
    }

    const isValid = this.verifyCode(secret, code);
    if (!isValid) {
      throw new BadRequestException('Invalid TOTP code. Please try again.');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: true,
        twoFactorSecret: secret,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'user.2fa_enabled',
        entityType: 'User',
        entityId: userId,
      },
    });

    this.logger.log(`2FA enabled for user ${userId}`);

    return { message: 'Two-factor authentication has been enabled successfully' };
  }

  /**
   * Disable 2FA for a user after verifying the current code.
   */
  async disable(userId: string, code: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorEnabled: true, twoFactorSecret: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new BadRequestException('Two-factor authentication is not enabled');
    }

    const isValid = this.verifyCode(user.twoFactorSecret, code);
    if (!isValid) {
      throw new BadRequestException('Invalid TOTP code. Please try again.');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'user.2fa_disabled',
        entityType: 'User',
        entityId: userId,
      },
    });

    this.logger.log(`2FA disabled for user ${userId}`);

    return { message: 'Two-factor authentication has been disabled' };
  }

  /**
   * Validate a TOTP code for a user during login.
   */
  async validateForUser(userId: string, code: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorSecret: true, twoFactorEnabled: true },
    });

    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      return false;
    }

    return this.verifyCode(user.twoFactorSecret, code);
  }

  /**
   * Generate a TOTP code for a given secret and time counter.
   */
  private generateTOTP(base32Secret: string, counter: number): string {
    const secretBytes = this.base32Decode(base32Secret);

    // Convert counter to 8-byte buffer (big-endian)
    const counterBuffer = Buffer.alloc(8);
    let tmp = counter;
    for (let i = 7; i >= 0; i--) {
      counterBuffer[i] = tmp & 0xff;
      tmp = Math.floor(tmp / 256);
    }

    // HMAC-SHA1
    const hmac = crypto.createHmac('sha1', secretBytes);
    hmac.update(counterBuffer);
    const hmacResult = hmac.digest();

    // Dynamic truncation
    const offset = hmacResult[hmacResult.length - 1] & 0x0f;
    const binary =
      ((hmacResult[offset] & 0x7f) << 24) |
      ((hmacResult[offset + 1] & 0xff) << 16) |
      ((hmacResult[offset + 2] & 0xff) << 8) |
      (hmacResult[offset + 3] & 0xff);

    const otp = binary % Math.pow(10, this.TOTP_DIGITS);
    return otp.toString().padStart(this.TOTP_DIGITS, '0');
  }

  /**
   * Encode a buffer as base32 (RFC 4648).
   */
  private base32Encode(buffer: Buffer): string {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = 0;
    let value = 0;
    let output = '';

    for (let i = 0; i < buffer.length; i++) {
      value = (value << 8) | buffer[i];
      bits += 8;
      while (bits >= 5) {
        output += alphabet[(value >>> (bits - 5)) & 0x1f];
        bits -= 5;
      }
    }

    if (bits > 0) {
      output += alphabet[(value << (5 - bits)) & 0x1f];
    }

    return output;
  }

  /**
   * Decode a base32 string to a buffer.
   */
  private base32Decode(encoded: string): Buffer {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const cleaned = encoded.toUpperCase().replace(/=+$/, '');
    let bits = 0;
    let value = 0;
    const output: number[] = [];

    for (let i = 0; i < cleaned.length; i++) {
      const idx = alphabet.indexOf(cleaned[i]);
      if (idx === -1) continue;
      value = (value << 5) | idx;
      bits += 5;
      if (bits >= 8) {
        output.push((value >>> (bits - 8)) & 0xff);
        bits -= 8;
      }
    }

    return Buffer.from(output);
  }
}
