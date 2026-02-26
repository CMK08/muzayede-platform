import {
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  IsUrl,
  IsPhoneNumber,
  IsEmail,
  IsArray,
  IsDateString,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Ahmet' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Yilmaz' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  lastName?: string;

  @ApiPropertyOptional({ example: 'ahmet_collector' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  displayName?: string;

  @ApiPropertyOptional({ example: 'newemail@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+905551234567' })
  @IsOptional()
  @IsPhoneNumber()
  phone?: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.jpg' })
  @IsOptional()
  @IsUrl()
  avatarUrl?: string;

  @ApiPropertyOptional({ example: 'Istanbul antika koleksiyoncusu' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @ApiPropertyOptional({ example: 'Kadikoy Mah. Bagdat Cad. No:123' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'Istanbul' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'TR' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ example: '34710' })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional({ example: ['antika', 'tablo', 'seramik'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  interests?: string[];

  @ApiPropertyOptional({ example: '1990-05-15' })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ example: 'tr' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ example: 'DARK' })
  @IsOptional()
  @IsString()
  theme?: string;
}
