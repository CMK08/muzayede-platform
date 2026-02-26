import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsNumber,
  IsBoolean,
  ValidateNested,
  IsUrl,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ProductAttributeDto, ProductMediaDto } from './create-product.dto';

export class MediaSortOrderDto {
  @IsString()
  mediaId: string;

  @IsNumber()
  @Min(0)
  sortOrder: number;
}

export class UpdateProductDto {
  @ApiPropertyOptional({ example: 'Osmanlı Dönemi Vazo - Güncellenmiş' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shortDescription?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  descriptionHtml?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ enum: ['NEW', 'USED', 'RESTORED'] })
  @IsOptional()
  @IsEnum(['NEW', 'USED', 'RESTORED'])
  condition?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  provenanceText?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  certificateUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  estimateLow?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  estimateHigh?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  artistId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ type: [ProductAttributeDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductAttributeDto)
  attributes?: ProductAttributeDto[];

  @ApiPropertyOptional({ type: [ProductMediaDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductMediaDto)
  media?: ProductMediaDto[];

  @ApiPropertyOptional({ example: ['antika', 'osmanlı'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ type: [MediaSortOrderDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MediaSortOrderDto)
  mediaSortOrders?: MediaSortOrderDto[];
}
