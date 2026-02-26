import { Injectable, Logger, BadRequestException, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

interface OtpRecord {
  hashedCode: string;
  expiresAt: Date;
  attempts: number;
  verified: boolean;
}

@Injectable()
export class OtpService implements OnModuleDestroy {
  private readonly logger = new Logger(OtpService.name);
  private readonly otpStore = new Map<string, OtpRecord>();
  private readonly MAX_ATTEMPTS = 5;
  private readonly OTP_TTL_MINUTES = 5;
  private readonly cleanupInterval: ReturnType<typeof setInterval>;

  constructor(private readonly configService: ConfigService) {
    // Clean up expired OTPs every 60 seconds
    this.cleanupInterval = setInterval(() => this.cleanupExpired(), 60_000);
  }

  onModuleDestroy(): void {
    clearInterval(this.cleanupInterval);
  }

  /**
   * Generate a 6-digit OTP, hash it, and store. Send via the specified channel.
   */
  async generateOtp(
    target: string,
    channel: 'sms' | 'email',
  ): Promise<{ message: string; expiresIn: number }> {
    // Rate limiting: if there's an existing unexpired OTP created less than 60s ago, reject
    const existing = this.otpStore.get(target);
    if (existing && existing.expiresAt > new Date()) {
      const ageMs = Date.now() - (existing.expiresAt.getTime() - this.OTP_TTL_MINUTES * 60 * 1000);
      if (ageMs < 60_000) {
        throw new BadRequestException('Please wait at least 60 seconds before requesting a new OTP');
      }
    }

    const code = this.generateCode();
    const hashedCode = this.hashCode(code);
    const expiresAt = new Date(Date.now() + this.OTP_TTL_MINUTES * 60 * 1000);

    this.otpStore.set(target, {
      hashedCode,
      expiresAt,
      attempts: 0,
      verified: false,
    });

    if (channel === 'sms') {
      await this.sendSms(target, code);
    } else {
      await this.sendEmail(target, code);
    }

    this.logger.log(`OTP generated for ${this.maskTarget(target)} via ${channel}`);

    return {
      message: `OTP sent via ${channel}`,
      expiresIn: this.OTP_TTL_MINUTES * 60,
    };
  }

  /**
   * Verify a provided OTP code against the stored hash.
   * Max 5 attempts; auto-expires after 5 minutes.
   */
  async verifyOtp(target: string, code: string): Promise<{ verified: boolean }> {
    const record = this.otpStore.get(target);

    if (!record) {
      throw new BadRequestException('No OTP found for this target. Please request a new one.');
    }

    if (record.attempts >= this.MAX_ATTEMPTS) {
      this.otpStore.delete(target);
      throw new BadRequestException(
        'Maximum verification attempts exceeded. Please request a new OTP.',
      );
    }

    if (new Date() > record.expiresAt) {
      this.otpStore.delete(target);
      throw new BadRequestException('OTP has expired. Please request a new one.');
    }

    record.attempts += 1;

    const hashedInput = this.hashCode(code);
    if (hashedInput !== record.hashedCode) {
      const remaining = this.MAX_ATTEMPTS - record.attempts;
      throw new BadRequestException(
        `Invalid OTP. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`,
      );
    }

    record.verified = true;
    this.otpStore.delete(target);

    this.logger.log(`OTP verified for ${this.maskTarget(target)}`);
    return { verified: true };
  }

  /**
   * Generate a cryptographically random 6-digit code.
   */
  private generateCode(): string {
    // Use crypto for better randomness than Math.random
    const buffer = crypto.randomBytes(4);
    const num = buffer.readUInt32BE(0) % 900000 + 100000;
    return num.toString();
  }

  /**
   * Hash an OTP code using SHA-256 for secure storage.
   */
  private hashCode(code: string): string {
    return crypto.createHash('sha256').update(code).digest('hex');
  }

  /**
   * Mask the target for logging (privacy).
   */
  private maskTarget(target: string): string {
    if (target.includes('@')) {
      const [local, domain] = target.split('@');
      return `${local.substring(0, 2)}***@${domain}`;
    }
    return `${target.substring(0, 4)}***${target.substring(target.length - 2)}`;
  }

  /**
   * Clean up expired OTP records to prevent memory leaks.
   */
  private cleanupExpired(): void {
    const now = new Date();
    let cleaned = 0;
    for (const [key, record] of this.otpStore.entries()) {
      if (now > record.expiresAt) {
        this.otpStore.delete(key);
        cleaned++;
      }
    }
    if (cleaned > 0) {
      this.logger.debug(`Cleaned up ${cleaned} expired OTP records`);
    }
  }

  private async sendSms(phone: string, code: string): Promise<void> {
    // Integration point for SMS provider (Twilio, Netgsm, etc.)
    // In production, this would call the actual SMS API.
    this.logger.log(`[SMS] OTP sent to ${this.maskTarget(phone)}`);
    if (this.configService.get<string>('NODE_ENV') === 'development') {
      this.logger.debug(`[DEV SMS] Code: ${code} -> ${phone}`);
    }
  }

  private async sendEmail(email: string, code: string): Promise<void> {
    // Integration point for email service (SendGrid, SES, etc.)
    // In production, this would call the actual email API.
    this.logger.log(`[Email] OTP sent to ${this.maskTarget(email)}`);
    if (this.configService.get<string>('NODE_ENV') === 'development') {
      this.logger.debug(`[DEV Email] Code: ${code} -> ${email}`);
    }
  }
}
