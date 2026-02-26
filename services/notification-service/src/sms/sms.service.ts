import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly provider: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.provider = this.configService.get<string>('SMS_PROVIDER', 'netgsm');
  }

  async sendSms(
    userId: string,
    type: string,
    data: Record<string, any>,
  ): Promise<void> {
    // Resolve phone number from Prisma by userId
    let phone = data.phone;

    if (!phone) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { phone: true },
      });

      phone = user?.phone;
    }

    if (!phone) {
      this.logger.warn(`No phone number available for user: ${userId}`);
      return;
    }

    // Format Turkish phone number
    phone = this.formatTurkishPhone(phone);
    const message = this.buildMessage(type, data);

    switch (this.provider) {
      case 'netgsm':
        await this.sendViaNetgsm(phone, message);
        break;
      case 'twilio':
        await this.sendViaTwilio(phone, message);
        break;
      default:
        this.logger.warn(`Unknown SMS provider: ${this.provider}, logging message`);
        this.logger.log(`[SMS] To: ${phone}, Message: ${message}`);
    }

    this.logger.log(
      `SMS sent: type=${type}, phone=${phone.substring(0, 6)}***`,
    );
  }

  private formatTurkishPhone(phone: string): string {
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');

    // If starts with 0, replace with 90
    if (cleaned.startsWith('0') && cleaned.length === 11) {
      cleaned = '90' + cleaned.substring(1);
    }

    // If doesn't start with 90, prepend it
    if (!cleaned.startsWith('90') && cleaned.length === 10) {
      cleaned = '90' + cleaned;
    }

    // Return with + prefix
    return '+' + cleaned;
  }

  private buildMessage(type: string, data: Record<string, any>): string {
    const templates: Record<string, string> = {
      bid_outbid: `Muzayede: "${data.auctionTitle}" icin teklifiniz gecildi. Yeni fiyat: ${data.currentPrice} TL`,
      auction_won: `Tebrikler! "${data.auctionTitle}" muzayedesini ${data.winningAmount} TL ile kazandiniz. 48 saat icinde odemenizi tamamlayin.`,
      auction_starting_soon: `Muzayede: "${data.auctionTitle}" ${data.startsIn} dakika icinde basliyor!`,
      otp_verification: `Muzayede dogrulama kodunuz: ${data.code}. 5 dakika icinde gecerlidir.`,
      payment_received: `Muzayede: ${data.amount} TL odemeniz basariyla alindi. Siparis No: ${data.orderNumber || ''}`,
      bid_placed: `Muzayede: "${data.auctionTitle}" icin ${data.bidAmount} TL teklifiniz alindi.`,
      shipping_update: `Muzayede: Siparisinisin kargo durumu: ${data.shipmentStatus}. Takip No: ${data.trackingNumber || ''}`,
      welcome: `Muzayede platformuna hosgeldiniz! Hesabiniz basariyla olusturuldu.`,
      password_reset: `Muzayede sifre sifirlama kodunuz: ${data.code}. 10 dakika icinde gecerlidir.`,
    };

    return (
      templates[type] ||
      `Muzayede: ${data.message || 'Yeni bir bildiriminiz var.'}`
    );
  }

  private async sendViaNetgsm(phone: string, message: string): Promise<void> {
    const userCode = this.configService.get<string>('NETGSM_USER_CODE', '');
    const password = this.configService.get<string>('NETGSM_PASSWORD', '');
    const msgHeader = this.configService.get<string>(
      'NETGSM_MSG_HEADER',
      'MUZAYEDE',
    );

    if (!userCode || !password) {
      this.logger.warn(
        '[Netgsm] No API credentials configured. SMS logged instead of sent.',
      );
      this.logger.log(`[Netgsm-DEV] To: ${phone}, Message: ${message}`);
      return;
    }

    // Clean phone number (remove +)
    const cleanPhone = phone.replace('+', '');

    const url = new URL('https://api.netgsm.com.tr/sms/send/get');
    url.searchParams.set('usercode', userCode);
    url.searchParams.set('password', password);
    url.searchParams.set('gsmno', cleanPhone);
    url.searchParams.set('message', message);
    url.searchParams.set('msgheader', msgHeader);
    url.searchParams.set('dil', 'TR');

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      const responseText = await response.text();

      // Netgsm returns codes: 00 = success, 20 = message too long, 30 = invalid credentials, etc.
      const responseCode = responseText.trim().split(' ')[0];

      if (responseCode === '00' || responseCode === '01' || responseCode === '02') {
        this.logger.log(
          `[Netgsm] SMS sent successfully to ${cleanPhone}: code=${responseCode}`,
        );
      } else {
        this.logger.error(
          `[Netgsm] SMS failed: code=${responseCode}, response=${responseText}`,
        );
        throw new Error(`Netgsm SMS failed with code: ${responseCode}`);
      }
    } catch (error: any) {
      if (error.message?.includes('Netgsm SMS failed')) {
        throw error;
      }
      this.logger.error(`[Netgsm] HTTP request failed: ${error.message}`);
      throw new Error(`Failed to send SMS via Netgsm: ${error.message}`);
    }
  }

  private async sendViaTwilio(phone: string, message: string): Promise<void> {
    const accountSid = this.configService.get<string>(
      'TWILIO_ACCOUNT_SID',
      '',
    );
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN', '');
    const fromNumber = this.configService.get<string>(
      'TWILIO_FROM_NUMBER',
      '',
    );

    if (!accountSid || !authToken) {
      this.logger.warn(
        '[Twilio] No API credentials configured. SMS logged instead of sent.',
      );
      this.logger.log(`[Twilio-DEV] To: ${phone}, Message: ${message}`);
      return;
    }

    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

    try {
      const body = new URLSearchParams({
        To: phone,
        From: fromNumber,
        Body: message,
      });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Twilio API error: ${response.status} - ${errorBody}`);
      }

      const result = await response.json();
      this.logger.log(
        `[Twilio] SMS sent: sid=${result.sid}, to=${phone}`,
      );
    } catch (error: any) {
      this.logger.error(`[Twilio] Failed to send SMS: ${error.message}`);
      throw error;
    }
  }
}
