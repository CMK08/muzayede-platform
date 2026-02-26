import {
  Controller,
  Get,
  Post,
  Put,
  Body,
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
import { SellerProfileService } from './seller-profile.service';
import { CreateSellerProfileDto } from './dto/create-seller-profile.dto';
import { UpdateSellerProfileDto } from './dto/update-seller-profile.dto';

@ApiTags('seller-profiles')
@ApiBearerAuth()
@Controller('users')
export class SellerProfileController {
  constructor(private readonly sellerProfileService: SellerProfileService) {}

  @Post(':id/seller-profile')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create seller profile',
    description: 'Creates a seller profile for the user and changes their role to SELLER (pending admin approval).',
  })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 201, description: 'Seller profile created successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'Seller profile already exists or slug taken' })
  async create(
    @Param('id') id: string,
    @Body() dto: CreateSellerProfileDto,
  ) {
    return this.sellerProfileService.create(id, dto);
  }

  @Get(':id/seller-profile')
  @ApiOperation({
    summary: 'Get seller profile with stats',
    description: 'Returns seller profile with statistics: total auctions, total sales, completion rate.',
  })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Returns seller profile with stats' })
  @ApiResponse({ status: 404, description: 'Seller profile not found' })
  async findOne(@Param('id') id: string) {
    return this.sellerProfileService.findByUserId(id);
  }

  @Put(':id/seller-profile')
  @ApiOperation({
    summary: 'Update seller profile',
    description: 'Updates seller profile fields.',
  })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Seller profile updated successfully' })
  @ApiResponse({ status: 404, description: 'Seller profile not found' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateSellerProfileDto,
  ) {
    return this.sellerProfileService.update(id, dto);
  }
}
