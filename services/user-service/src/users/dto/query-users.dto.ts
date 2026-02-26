import { IsOptional, IsString, IsInt, Min, Max, IsEnum, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum SortBy {
  CREATED_AT = 'createdAt',
  TRUST_SCORE = 'trustScore',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class QueryUsersDto {
  @ApiPropertyOptional({ example: 1, description: 'Page number' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, description: 'Items per page' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ example: 'ahmet', description: 'Search by email, firstName, or lastName' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 'BUYER', description: 'Filter by user role' })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional({ example: true, description: 'Filter by active status' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 'APPROVED', description: 'Filter by KYC status' })
  @IsOptional()
  @IsString()
  kycStatus?: string;

  @ApiPropertyOptional({ enum: SortBy, example: 'createdAt', description: 'Sort field' })
  @IsOptional()
  @IsEnum(SortBy)
  sortBy?: SortBy = SortBy.CREATED_AT;

  @ApiPropertyOptional({ enum: SortOrder, example: 'desc', description: 'Sort order' })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.DESC;
}
