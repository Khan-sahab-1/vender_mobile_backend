import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { PricelistsService } from './pricelists.service';
import { CreatePricelistDto } from './dto/create-pricelist.dto';
import { UpdatePricelistDto } from './dto/update-pricelist.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Pricelists')
@ApiBearerAuth()
@Controller('pricelists')
export class PricelistsController {
  constructor(private readonly service: PricelistsService) {}

  @Post()
  @Roles('admin', 'sales_manager')
  create(@Body() dto: CreatePricelistDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Get(':id/price')
  @ApiQuery({ name: 'productId', required: true })
  @ApiQuery({ name: 'quantity', required: false })
  getPrice(
    @Param('id') id: string,
    @Query('productId') productId: string,
    @Query('quantity') quantity?: number,
  ) {
    return this.service.getPrice(id, productId, quantity ? Number(quantity) : 1);
  }

  @Patch(':id')
  @Roles('admin', 'sales_manager')
  update(@Param('id') id: string, @Body() dto: UpdatePricelistDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles('admin', 'sales_manager')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
