import {
  Controller,
  Post,
  Get,
  Put,
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
  ApiQuery,
} from '@nestjs/swagger';
import { OrdersService } from './orders.service';

// ----------------------------------------------------------------
// DTOs
// ----------------------------------------------------------------

class CreateOrderDto {
  auctionId: string;
  lotId?: string;
  buyerId: string;
  hammerPrice: number;
}

class UpdateOrderStatusDto {
  status: string;
  notes?: string;
}

// ----------------------------------------------------------------
// Controller
// ----------------------------------------------------------------

@ApiTags('orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Create an order after auction win' })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  async createOrder(@Body() dto: CreateOrderDto) {
    return this.ordersService.createOrder(
      dto.auctionId,
      dto.lotId || null,
      dto.buyerId,
      dto.hammerPrice,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order details by ID' })
  @ApiResponse({ status: 200, description: 'Order details returned' })
  async getOrder(@Param('id') id: string) {
    return this.ordersService.getOrder(id);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update order status' })
  @ApiResponse({ status: 200, description: 'Order status updated' })
  async updateOrder(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateOrderStatus(id, dto.status);
  }

  @Get()
  @ApiOperation({ summary: 'List orders with pagination and filters' })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({
    name: 'role',
    required: false,
    enum: ['buyer', 'seller'],
    type: String,
  })
  @ApiResponse({ status: 200, description: 'Paginated order list' })
  async listOrders(
    @Query('userId') userId?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: string,
    @Query('role') role?: 'buyer' | 'seller',
  ) {
    if (!userId) {
      // If no userId, return empty result with a hint
      return {
        data: [],
        meta: { page, limit, total: 0, totalPages: 0 },
        message: 'Provide a userId query parameter to list orders',
      };
    }

    return this.ordersService.getUserOrders(userId, page, limit, {
      status,
      role,
    });
  }
}
