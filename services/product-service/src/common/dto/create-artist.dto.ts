import { IsString, IsOptional, IsNumber, IsUrl, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateArtistDto {
  @ApiProperty({ example: 'Osman Hamdi Bey' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Türk ressam ve arkeolog...' })
  @IsOptional()
  @IsString()
  biography?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/artist.jpg' })
  @IsOptional()
  @IsUrl()
  photoUrl?: string;

  @ApiPropertyOptional({ example: 1842 })
  @IsOptional()
  @IsNumber()
  birthYear?: number;

  @ApiPropertyOptional({ example: 1910 })
  @IsOptional()
  @IsNumber()
  deathYear?: number;

  @ApiPropertyOptional({ example: 'Turkish' })
  @IsOptional()
  @IsString()
  nationality?: string;
}

export class UpdateArtistDto {
  @ApiPropertyOptional({ example: 'Osman Hamdi Bey' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  biography?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  photoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  birthYear?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  deathYear?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nationality?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class QueryArtistDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumber()
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsNumber()
  limit?: number = 20;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}
