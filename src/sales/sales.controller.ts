import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { SalesService } from './sales.service';
import { CreateSalesOrderDto } from './dto/create-sales-order.dto';
import { UpdateSalesOrderDto } from './dto/update-sales-order.dto';

@ApiTags('Sales Orders')
@ApiBearerAuth()
@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get summary statistics for sales dashboard' })
  getStats() {
    return this.salesService.getSalesStats();
  }

  @Get('orders')
  @ApiOperation({ summary: 'List sales orders with optional filters' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({
    name: 'state',
    required: false,
    enum: ['all', 'draft', 'sent', 'sale', 'done', 'cancel'],
  })
  @ApiQuery({ name: 'limit', required: false })
  getOrders(
    @Query('search') search?: string,
    @Query('state') state?: string,
    @Query('limit') limit?: number,
  ) {
    return this.salesService.getSalesOrders({
      search,
      state: state || 'all',
      limit: limit ? Number(limit) : 50,
    });
  }

  @Post('orders')
  @ApiOperation({ summary: 'Create a new Sales Order' })
  createOrder(@Body() dto: CreateSalesOrderDto) {
    return this.salesService.create(dto);
  }

  @Get('orders/:id')
  @ApiOperation({ summary: 'Get Sales Order detail by ID' })
  getOrderDetail(@Param('id') id: string) {
    return this.salesService.getSalesOrderDetail(id);
  }

  @Patch('orders/:id')
  @Put('orders/:id')
  @ApiOperation({ summary: 'Update an existing Sales Order' })
  updateOrder(@Param('id') id: string, @Body() dto: UpdateSalesOrderDto) {
    return this.salesService.update(id, dto);
  }

  @Post('orders/:id/send-for-approval')
  @ApiOperation({ summary: 'Send Sales Order for management approval' })
  sendForApproval(@Param('id') id: string) {
    return this.salesService.sendForApproval(id);
  }

  @Post('orders/:id/approve')
  @ApiOperation({ summary: 'Management approve Sales Order' })
  approveOrder(@Param('id') id: string) {
    return this.salesService.approveOrder(id);
  }

  @Post('orders/:id/confirm')
  @ApiOperation({ summary: 'Confirm Sales Order (convert quotation to order)' })
  confirmOrder(@Param('id') id: string) {
    return this.salesService.confirmOrder(id);
  }

  @Post('orders/:id/deliver-goods')
  @ApiOperation({ summary: 'Deliver goods and deduct from warehouse stock' })
  deliverGoods(@Param('id') id: string) {
    return this.salesService.deliverGoods(id);
  }

  @Post('orders/:id/cancel')
  @ApiOperation({ summary: 'Cancel Sales Order' })
  cancelOrder(@Param('id') id: string) {
    return this.salesService.cancelOrder(id);
  }
}
