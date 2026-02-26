import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsNumber,
  ValidateNested,
  IsUrl,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProductAttributeDto {
  @ApiProperty({ example: 'boyut' })
  @IsString()
  key: string;

  @ApiProperty({ example: '50x70 cm' })
  @IsString()
  value: string;
}

export class ProductMediaDto {
  @ApiProperty({ example: 'https://cdn.example.com/image.jpg' })
  @IsUrl()
  url: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/thumb.jpg' })
  @IsOptional()
  @IsUrl()
  thumbnailUrl?: string;

  @ApiPropertyOptional({ enum: ['IMAGE', 'VIDEO', 'THREE_SIXTY'], default: 'IMAGE' })
  @IsOptional()
  @IsEnum(['IMAGE', 'VIDEO', 'THREE_SIXTY'])
  type?: string;
}

export class CreateProductDto {
  @ApiProperty({ example: 'Osmanlı Dönemi Vazo' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ example: 'Kısa açıklama' })
  @IsOptional()
  @IsString()
  shortDescription?: string;

  @ApiPropertyOptional({ example: '<p>Detaylı HTML açıklama</p>' })
  @IsOptional()
  @IsString()
  descriptionHtml?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({ enum: ['NEW', 'USED', 'RESTORED'], default: 'USED' })
  @IsOptional()
  @IsEnum(['NEW', 'USED', 'RESTORED'])
  condition?: string;

  @ApiPropertyOptional({ example: 'Koleksiyoncu aileden gelen parça' })
  @IsOptional()
  @IsString()
  provenanceText?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/cert.pdf' })
  @IsOptional()
  @IsString()
  certificateUrl?: string;

  @ApiPropertyOptional({ example: 5000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  estimateLow?: number;

  @ApiPropertyOptional({ example: 10000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  estimateHigh?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  artistId?: string;

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

  @ApiPropertyOptional({ example: ['antika', 'osmanlı', 'seramik'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
