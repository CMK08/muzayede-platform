import {
  IsString,
  IsOptional,
  IsUrl,
  MinLength,
  MaxLength,
  IsObject,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSellerProfileDto {
  @ApiProperty({ example: 'Antika Dunyasi', description: 'Store name' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  storeName: string;

  @ApiProperty({ example: 'antika-dunyasi', description: 'Unique store slug for URL' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Store slug must be lowercase and contain only letters, numbers, and hyphens',
  })
  storeSlug: string;

  @ApiPropertyOptional({ example: 'Antika Dunyasi Ltd. Sti.', description: 'Legal company name' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  companyName?: string;

  @ApiPropertyOptional({ example: 'Istanbul\'un en kaliteli antika magazi', description: 'Store description' })
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
