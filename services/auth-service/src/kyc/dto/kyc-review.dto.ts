import { IsString, IsIn, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class KycReviewDto {
  @ApiProperty({
    example: 'APPROVED',
    description: 'Review decision',
    enum: ['APPROVED', 'REJECTED'],
  })
  @IsString()
  @IsIn(['APPROVED', 'REJECTED'], {
    message: 'Status must be either APPROVED or REJECTED',
  })
  status: 'APPROVED' | 'REJECTED';

  @ApiPropertyOptional({
    example: 'Document verified successfully',
    description: 'Optional review note',
  })
  @IsOptional()
  @IsString()
  reviewNote?: string;
}
