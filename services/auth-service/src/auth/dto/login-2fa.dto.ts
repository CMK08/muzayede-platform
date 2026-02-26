import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class Login2faDto {
  @ApiProperty({ description: 'Temporary token received from the login endpoint when 2FA is required' })
  @IsString()
  tempToken: string;

  @ApiProperty({ example: '123456', description: 'TOTP code from authenticator app' })
  @IsString()
  @Length(6, 6, { message: 'TOTP code must be exactly 6 digits' })
  code: string;
}
