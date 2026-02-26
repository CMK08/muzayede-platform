import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { FavoritesService } from './favorites.service';

@ApiTags('favorites')
@ApiBearerAuth()
@Controller()
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Post('products/:id/favorite')
  @ApiOperation({ summary: 'Add product to favorites' })
  @ApiResponse({ status: 201, description: 'Product added to favorites' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ApiResponse({ status: 409, description: 'Already favorited' })
  async addFavorite(
    @Param('id') productId: string,
    @Headers('x-user-id') userId: string,
  ) {
    return this.favoritesService.addFavorite(productId, userId);
  }

  @Delete('products/:id/favorite')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove product from favorites' })
  @ApiResponse({ status: 204, description: 'Favorite removed' })
  @ApiResponse({ status: 404, description: 'Favorite not found' })
  async removeFavorite(
    @Param('id') productId: string,
    @Headers('x-user-id') userId: string,
  ) {
    return this.favoritesService.removeFavorite(productId, userId);
  }

  @Get('products/:id/favorite/status')
  @ApiOperation({ summary: 'Check if product is favorited by current user' })
  @ApiResponse({ status: 200, description: 'Returns favorite status' })
  async isFavorited(
    @Param('id') productId: string,
    @Headers('x-user-id') userId: string,
  ) {
    const favorited = await this.favoritesService.isFavorited(productId, userId);
    return { productId, favorited };
  }

  @Get('users/:userId/favorites')
  @ApiOperation({ summary: 'Get user favorites list' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Returns paginated favorites' })
  async getUserFavorites(
    @Param('userId') userId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.favoritesService.getUserFavorites(userId, page, limit);
  }
}
