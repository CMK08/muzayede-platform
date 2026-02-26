import { IsString, IsIn, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class KycUploadDto {
  @ApiProperty({
    example: 'identity_card',
    description: 'Type of KYC document',
    enum: ['identity_card', 'passport', 'address_proof'],
  })
  @IsString()
  @IsIn(['identity_card', 'passport', 'address_proof'], {
    message: 'Document type must be one of: identity_card, passport, address_proof',
  })
  documentType: string;

  @ApiProperty({
    example: 'https://storage.muzayede.com/kyc/doc-123.pdf',
    description: 'URL of the uploaded document',
  })
  @IsUrl({}, { message: 'Please provide a valid document URL' })
  documentUrl: string;
}
