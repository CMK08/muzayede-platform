import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as nodemailer from 'nodemailer';
import * as Handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: nodemailer.Transporter;
  private readonly fromAddress: string;
  private readonly templateCache = new Map<string, Handlebars.TemplateDelegate>();

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.fromAddress = this.configService.get<string>(
      'EMAIL_FROM',
      'noreply@muzayede.com',
    );

    const smtpHost = this.configService.get<string>('SMTP_HOST', '');
    const smtpUser = this.configService.get<string>('SMTP_USER', '');

    if (smtpHost && smtpUser) {
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: this.configService.get<number>('SMTP_PORT', 587),
        secure: this.configService.get<number>('SMTP_PORT', 587) === 465,
        auth: {
          user: smtpUser,
          pass: this.configService.get<string>('SMTP_PASS', ''),
        },
      });
      this.logger.log(`Email transport configured: ${smtpHost}`);
    } else {
      // Create a test transport for development
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: 'test@ethereal.email',
          pass: 'test',
        },
      });
      this.logger.warn(
        'No SMTP credentials configured. Emails will be logged but not sent.',
      );
    }
  }

  async sendTemplatedEmail(
    userId: string,
    templateName: string,
    data: Record<string, any>,
  ): Promise<void> {
    // Resolve user email and name from Prisma
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        profile: {
          select: { firstName: true, lastName: true, displayName: true },
        },
      },
    });

    const toEmail = user?.email || data.email;
    if (!toEmail) {
      this.logger.warn(`No email address found for user: ${userId}`);
      return;
    }

    // Enrich data with user info
    const enrichedData = {
      ...data,
      firstName:
        data.firstName ||
        user?.profile?.firstName ||
        user?.profile?.displayName ||
        'Degerli Kullanicimiz',
      lastName: data.lastName || user?.profile?.lastName || '',
      email: toEmail,
    };

    const template = this.getTemplate(templateName);
    const html = template(enrichedData);
    const subject = this.getSubjectForTemplate(templateName, enrichedData);

    try {
      const smtpHost = this.configService.get<string>('SMTP_HOST', '');
      const smtpUser = this.configService.get<string>('SMTP_USER', '');

      if (smtpHost && smtpUser) {
        const info = await this.transporter.sendMail({
          from: this.fromAddress,
          to: toEmail,
          subject,
          html,
        });
        this.logger.log(
          `Email sent: template=${templateName}, to=${toEmail}, messageId=${info.messageId}`,
        );
      } else {
        this.logger.log(
          `[DEV] Email would be sent: template=${templateName}, to=${toEmail}, subject="${subject}"`,
        );
      }
    } catch (error: any) {
      this.logger.error(
        `Failed to send email: template=${templateName}, to=${toEmail}, error=${error.message}`,
      );
      throw error;
    }
  }

  private getTemplate(name: string): Handlebars.TemplateDelegate {
    if (this.templateCache.has(name)) {
      return this.templateCache.get(name)!;
    }

    const templatePath = path.join(__dirname, '..', 'templates', `${name}.hbs`);

    let source: string;
    try {
      source = fs.readFileSync(templatePath, 'utf-8');
    } catch {
      this.logger.debug(
        `Template file not found: ${templatePath}, using default template`,
      );
      source = this.getDefaultTemplate(name);
    }

    const template = Handlebars.compile(source);
    this.templateCache.set(name, template);
    return template;
  }

  private getSubjectForTemplate(
    templateName: string,
    data: Record<string, any>,
  ): string {
    const subjects: Record<string, string> = {
      bid_placed: `Yeni teklif: "${data.auctionTitle || 'muzayedeniz'}"`,
      bid_outbid: `Teklifiniz gecildi: "${data.auctionTitle || 'muzayede'}"`,
      auction_won: `Tebrikler! Kazandiniz: "${data.auctionTitle || 'muzayede'}"`,
      auction_ended: `Muzayede sona erdi: "${data.auctionTitle || ''}"`,
      auction_starting_soon: `Muzayede basliyor: "${data.auctionTitle || ''}"`,
      welcome: "Muzayede'ye Hosgeldiniz!",
      password_reset: 'Sifre sifirlama talebi',
      payment_received: 'Odeme onay',
      shipping_update: 'Kargo guncelleme',
      otp_verification: 'Dogrulama kodunuz',
    };

    return subjects[templateName] || 'Muzayede Bildirim';
  }

  private getDefaultTemplate(name: string): string {
    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0;">
  <div style="background-color: #1a1a2e; padding: 20px; text-align: center;">
    <h1 style="color: #e94560; margin: 0;">MUZAYEDE</h1>
  </div>
  <div style="padding: 20px; background-color: #f8f9fa;">
    <h2 style="color: #1a1a2e;">{{title}}</h2>
    <p style="color: #333; line-height: 1.6;">Merhaba {{firstName}},</p>
    <p style="color: #333; line-height: 1.6;">{{message}}</p>
    {{#if actionUrl}}
    <a href="{{actionUrl}}" style="display: inline-block; background-color: #e94560; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin-top: 10px;">
      {{#if actionText}}{{actionText}}{{else}}Detaylari Gor{{/if}}
    </a>
    {{/if}}
  </div>
  <div style="padding: 10px; text-align: center; font-size: 12px; color: #666;">
    <p>Muzayede Platform &copy; 2026 - Tum haklari saklidir.</p>
  </div>
</body>
</html>`;
  }
}
