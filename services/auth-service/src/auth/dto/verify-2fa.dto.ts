import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class Verify2faDto {
  @ApiProperty({ example: '123456', description: 'TOTP code from authenticator app' })
  @IsString()
  @Length(6, 6, { message: 'TOTP code must be exactly 6 digits' })
  code: string;
}
