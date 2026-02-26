import {
  IsString,
  IsOptional,
  IsUrl,
  MaxLength,
  IsObject,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSellerProfileDto {
  @ApiPropertyOptional({ example: 'Antika Dunyasi', description: 'Store name' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  storeName?: string;

  @ApiPropertyOptional({ example: 'Antika Dunyasi Ltd. Sti.', description: 'Legal company name' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  companyName?: string;

  @ApiPropertyOptional({ example: 'Istanbul\'un en kaliteli antika magazasi', description: 'Store description' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ example: 'https://example.com/logo.png', description: 'Store logo URL' })
  @IsOptional()
  @IsUrl()
  logoUrl?: string;

  @ApiPropertyOptional({ example: 'https://example.com/banner.jpg', description: 'Store banner URL' })
  @IsOptional()
  @IsUrl()
  bannerUrl?: string;

  @ApiPropertyOptional({ example: 'https://antikadunyasi.com', description: 'Website URL' })
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiPropertyOptional({
    example: { instagram: '@antikadunyasi', twitter: '@antikadunyasi' },
    description: 'Social media links',
  })
  @IsOptional()
  @IsObject()
  socialMedia?: Record<string, string>;

  @ApiPropertyOptional({ example: 'TR123456789012345678901234', description: 'IBAN for payouts' })
  @IsOptional()
  @IsString()
  bankIban?: string;

  @ApiPropertyOptional({ example: 'Ziraat Bankasi', description: 'Bank name' })
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiPropertyOptional({ example: '1234567890', description: 'Tax identification number' })
  @IsOptional()
  @IsString()
  taxId?: string;
}
