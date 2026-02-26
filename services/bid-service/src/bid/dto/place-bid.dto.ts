import { IsString, IsNumber, Min, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum BidTypeDto {
  MANUAL = 'MANUAL',
  PROXY = 'PROXY',
  ABSENTEE = 'ABSENTEE',
  BUY_NOW = 'BUY_NOW',
}

export class PlaceBidDto {
  @ApiProperty({ example: 'clx123abc', description: 'Auction ID to bid on' })
  @IsString()
  auctionId: string;

  @ApiProperty({ example: 2500.0, description: 'Bid amount in auction currency' })
  @IsNumber()
  @Min(0.01, { message: 'Bid amount must be greater than zero' })
  amount: number;

  @ApiPropertyOptional({ enum: BidTypeDto, default: BidTypeDto.MANUAL })
  @IsOptional()
  @IsEnum(BidTypeDto)
  type?: BidTypeDto;

  @ApiPropertyOptional({ example: 5000.0, description: 'Maximum proxy bid amount' })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  maxProxyAmount?: number;

  @ApiPropertyOptional({ example: 'lot_abc123', description: 'Lot ID (for multi-lot auctions)' })
  @IsOptional()
  @IsString()
  lotId?: string;
}

export class RetractBidDto {
  @ApiProperty({ description: 'Reason for retracting the bid' })
  @IsString()
  reason: string;
}

export class ProxyBidDto {
  @ApiProperty({ example: 'clx123abc', description: 'Auction ID' })
  @IsString()
  auctionId: string;

  @ApiProperty({ example: 10000.0, description: 'Maximum amount for proxy bidding' })
  @IsNumber()
  @Min(0.01)
  maxAmount: number;
}

export class BidQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: ['amount', 'createdAt'], default: 'createdAt' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}

export class UserBidQueryDto extends BidQueryDto {
  @ApiPropertyOptional({ enum: ['all', 'active', 'won'], default: 'all' })
  @IsOptional()
  @IsString()
  filter?: 'all' | 'active' | 'won' = 'all';
}
