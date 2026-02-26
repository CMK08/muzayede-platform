import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class Enable2faDto {
  @ApiProperty({ example: '123456', description: 'TOTP code to confirm 2FA setup' })
  @IsString()
  @Length(6, 6, { message: 'TOTP code must be exactly 6 digits' })
  code: string;

  @ApiProperty({ description: 'The TOTP secret that was generated' })
  @IsString()
  secret: string;
}
