import { Module } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { EmailService } from '../email/email.service';
import { SmsService } from '../sms/sms.service';
import { PushService } from '../push/push.service';

@Module({
  controllers: [NotificationController],
  providers: [NotificationService, EmailService, SmsService, PushService],
  exports: [NotificationService],
})
export class NotificationModule {}
