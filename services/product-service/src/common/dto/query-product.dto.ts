import { IsOptional, IsString, IsNumber, IsEnum, IsBoolean, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export enum ProductSortBy {
  NEWEST = 'newest',
  OLDEST = 'oldest',
  PRICE_ASC = 'priceAsc',
  PRICE_DESC = 'priceDesc',
  TITLE = 'title',
}

export class QueryProductDto {
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sellerId?: string;

  @ApiPropertyOptional({ enum: ['NEW', 'USED', 'RESTORED'] })
  @IsOptional()
  @IsString()
  condition?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Min estimate low price' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  priceMin?: number;

  @ApiPropertyOptional({ description: 'Max estimate high price' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  priceMax?: number;

  @ApiPropertyOptional({ description: 'Search in product title' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ProductSortBy, default: ProductSortBy.NEWEST })
  @IsOptional()
  @IsEnum(ProductSortBy)
  sort?: ProductSortBy = ProductSortBy.NEWEST;
}
