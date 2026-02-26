import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsDateString,
  IsBoolean,
  IsArray,
  ValidateNested,
  Min,
  Max,
  MaxLength,
  MinLength,
  IsInt,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum AuctionTypeEnum {
  ENGLISH = 'ENGLISH',
  DUTCH = 'DUTCH',
  SEALED_BID = 'SEALED_BID',
  VICKREY = 'VICKREY',
  TIMED = 'TIMED',
  HYBRID = 'HYBRID',
}

export class BidIncrementDto {
  @ApiProperty({ example: 0, description: 'Price range start' })
  @IsNumber()
  @Min(0)
  priceFrom: number;

  @ApiProperty({ example: 1000, description: 'Price range end' })
  @IsNumber()
  @Min(0)
  priceTo: number;

  @ApiProperty({ example: 50, description: 'Increment amount within this range' })
  @IsNumber()
  @Min(0.01)
  incrementAmount: number;
}

export class AuctionLotDto {
  @ApiProperty({ example: 'clxxx_product_id' })
  @IsString()
  productId: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  lotNumber: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class CreateAuctionDto {
  @ApiProperty({ example: 'Osmanli Donemi Antik Vazo' })
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ example: 'Nadir bulunan 18. yuzyil Osmanli vazosu, mukemmel durumda' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiProperty({ enum: AuctionTypeEnum, example: AuctionTypeEnum.ENGLISH })
  @IsEnum(AuctionTypeEnum)
  type: AuctionTypeEnum;

  @ApiProperty({ example: 1000.0 })
  @IsNumber()
  @Min(0.01)
  startPrice: number;

  @ApiPropertyOptional({ example: 5000.0, description: 'Reserve price (hidden from bidders)' })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  reservePrice?: number;

  @ApiProperty({ example: 50.0, description: 'Minimum bid increment' })
  @IsNumber()
  @Min(0.01)
  minIncrement: number;

  @ApiPropertyOptional({ example: 0.05, description: 'Buyer commission rate (e.g. 0.05 for 5%)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  buyerCommissionRate?: number;

  @ApiPropertyOptional({ example: 0.10, description: 'Seller commission rate (e.g. 0.10 for 10%)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  sellerCommissionRate?: number;

  @ApiPropertyOptional({ example: 'TRY', default: 'TRY' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ example: '2026-03-01T10:00:00Z' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2026-03-08T10:00:00Z' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ example: 5, description: 'Anti-snipe threshold in minutes' })
  @IsOptional()
  @IsInt()
  @Min(0)
  antiSnipeMinutes?: number;

  @ApiPropertyOptional({ example: 3, description: 'Anti-snipe extension duration in minutes' })
  @IsOptional()
  @IsInt()
  @Min(0)
  antiSnipeExtension?: number;

  // Dutch auction specific
  @ApiPropertyOptional({ example: 10000.0, description: 'Dutch auction: starting high price' })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  dutchStartPrice?: number;

  @ApiPropertyOptional({ example: 100.0, description: 'Dutch auction: price decrement amount' })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  dutchDecrement?: number;

  @ApiPropertyOptional({ example: 60, description: 'Dutch auction: seconds between decrements' })
  @IsOptional()
  @IsInt()
  @Min(1)
  dutchDecrementInterval?: number;

  // Buy It Now
  @ApiPropertyOptional({ example: 15000.0 })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  buyNowPrice?: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  buyNowEnabled?: boolean;

  // Relations
  @ApiPropertyOptional({ example: 'clxxx_auction_house_id' })
  @IsOptional()
  @IsString()
  auctionHouseId?: string;

  @ApiPropertyOptional({ example: 'https://example.com/cover.jpg' })
  @IsOptional()
  @IsString()
  coverImageUrl?: string;

  @ApiPropertyOptional({ example: 'https://example.com/catalog.pdf' })
  @IsOptional()
  @IsString()
  catalogPdfUrl?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isLiveStreaming?: boolean;

  @ApiPropertyOptional({ example: 'rtmp://stream.example.com/live' })
  @IsOptional()
  @IsString()
  streamUrl?: string;

  // Lots
  @ApiPropertyOptional({ type: [AuctionLotDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AuctionLotDto)
  lots?: AuctionLotDto[];

  // Bid increments
  @ApiPropertyOptional({ type: [BidIncrementDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BidIncrementDto)
  bidIncrements?: BidIncrementDto[];
}
