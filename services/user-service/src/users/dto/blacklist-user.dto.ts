import { IsString, IsOptional, IsDateString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BlacklistUserDto {
  @ApiProperty({ example: 'Sahte teklif verme', description: 'Reason for blacklisting' })
  @IsString()
  @MinLength(5)
  reason: string;

  @ApiProperty({ example: 'admin-user-id-123', description: 'ID of the admin performing the action' })
  @IsString()
  blockedBy: string;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59.000Z', description: 'Expiration date (null for permanent)' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
