import {
  Controller,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
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
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { BlacklistUserDto } from './dto/blacklist-user.dto';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List users with pagination, search, and filters' })
  @ApiResponse({ status: 200, description: 'Returns paginated user list' })
  async findAll(@Query() query: QueryUsersDto) {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Returns user profile with relations' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update user profile' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'Email or phone already in use' })
  async update(@Param('id') id: string, @Body() dto: UpdateProfileDto) {
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Soft-delete user account',
    description:
      'Sets isActive=false and anonymizes email. Does NOT hard delete (KVKK compliance).',
  })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 204, description: 'User account deactivated' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async remove(@Param('id') id: string) {
    return this.usersService.softDelete(id);
  }

  @Get(':id/trust-score')
  @ApiOperation({ summary: 'Get user trust score breakdown' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns trust score with all component breakdowns',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getTrustScore(@Param('id') id: string) {
    return this.usersService.getTrustScore(id);
  }

  @Put(':id/blacklist')
  @ApiOperation({
    summary: 'Add user to blacklist',
    description:
      'Creates a UserBlacklist entry and deactivates the user account.',
  })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User blacklisted' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'User is already blacklisted' })
  async blacklist(
    @Param('id') id: string,
    @Body() dto: BlacklistUserDto,
  ) {
    return this.usersService.blacklist(id, dto);
  }

  @Delete(':id/blacklist')
  @ApiOperation({
    summary: 'Remove user from blacklist',
    description: 'Deletes the UserBlacklist entry and reactivates the user account.',
  })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User removed from blacklist' })
  @ApiResponse({ status: 404, description: 'User not found or not blacklisted' })
  async removeFromBlacklist(@Param('id') id: string) {
    return this.usersService.removeFromBlacklist(id);
  }
}
