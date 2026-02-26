import { IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendOtpDto {
  @ApiProperty({ example: 'user@example.com', description: 'Target email or phone number' })
  @IsString()
  target: string;

  @ApiProperty({ example: 'email', description: 'Channel to send OTP through', enum: ['sms', 'email'] })
  @IsIn(['sms', 'email'], { message: 'Channel must be either "sms" or "email"' })
  channel: 'sms' | 'email';
}
