import {
  IsString,
  IsNumber,
  IsOptional,
  IsDateString,
  IsBoolean,
  IsArray,
  IsInt,
  ValidateNested,
  Min,
  Max,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { AuctionLotDto, BidIncrementDto } from './create-auction.dto';

export class UpdateAuctionDto {
  @ApiPropertyOptional({ example: 'Updated Auction Title' })
  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({ example: 'Updated description with more details' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional({ example: 1500.0 })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  startPrice?: number;

  @ApiPropertyOptional({ example: 6000.0 })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  reservePrice?: number;

  @ApiPropertyOptional({ example: 100.0 })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  minIncrement?: number;

  @ApiPropertyOptional({ example: 0.05 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  buyerCommissionRate?: number;

  @ApiPropertyOptional({ example: 0.10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  sellerCommissionRate?: number;

  @ApiPropertyOptional({ example: '2026-03-02T10:00:00Z' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-03-09T10:00:00Z' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsInt()
  @Min(0)
  antiSnipeMinutes?: number;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsInt()
  @Min(0)
  antiSnipeExtension?: number;

  @ApiPropertyOptional({ example: 10000.0 })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  dutchStartPrice?: number;

  @ApiPropertyOptional({ example: 100.0 })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  dutchDecrement?: number;

  @ApiPropertyOptional({ example: 60 })
  @IsOptional()
  @IsInt()
  @Min(1)
  dutchDecrementInterval?: number;

  @ApiPropertyOptional({ example: 15000.0 })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  buyNowPrice?: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  buyNowEnabled?: boolean;

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

  @ApiPropertyOptional({ type: [AuctionLotDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AuctionLotDto)
  lots?: AuctionLotDto[];

  @ApiPropertyOptional({ type: [BidIncrementDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BidIncrementDto)
  bidIncrements?: BidIncrementDto[];
}
