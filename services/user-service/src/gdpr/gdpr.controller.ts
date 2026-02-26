import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { GdprService } from './gdpr.service';

@ApiTags('gdpr')
@ApiBearerAuth()
@Controller('users')
export class GdprController {
  constructor(private readonly gdprService: GdprService) {}

  @Get(':id/data-export')
  @ApiOperation({
    summary: 'Export user data (KVKK/GDPR)',
    description:
      'Exports all user data as JSON. Implements KVKK Article 11 / GDPR Article 15 - Right of Access.',
  })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns all user data as downloadable JSON',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async exportData(@Param('id') id: string) {
    return this.gdprService.exportUserData(id);
  }

  @Post(':id/data-freeze')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Freeze user data processing (KVKK/GDPR)',
    description:
      'Freezes all data processing for the user. Implements KVKK Article 11 / GDPR Article 18 - Right to Restriction.',
  })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'Data processing frozen successfully',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({
    status: 403,
    description: 'Data processing is already frozen',
  })
  async freezeData(@Param('id') id: string) {
    return this.gdprService.freezeUserData(id);
  }

  @Delete(':id/data-delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete/anonymize user data (KVKK/GDPR)',
    description:
      'Anonymizes all PII and deletes non-essential data. Transaction records are retained in anonymized form for legal compliance. Implements KVKK Article 7 / GDPR Article 17 - Right to Erasure.',
  })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'User data anonymized and non-essential data deleted',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async deleteData(@Param('id') id: string) {
    return this.gdprService.deleteUserData(id);
  }
}
