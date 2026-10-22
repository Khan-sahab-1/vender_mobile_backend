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
import { ProductCategoryService } from './product-category.service';
import { CreateProductCategoryDto } from './dto/create-product-category.dto';
import { UpdateProductCategoryDto } from './dto/update-product-category.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Product Categories')
@ApiBearerAuth()
@Controller('product-categories')
export class ProductCategoryController {
  constructor(private readonly service: ProductCategoryService) {}

  @Post()
  @Roles('admin', 'inventory_manager')
  create(@Body() dto: CreateProductCategoryDto, @CurrentUser() user: any) {
    return this.service.create(dto, user?.companyId);
  }

  @Get()
  @ApiQuery({
    name: 'page',
    required: false,
    schema: { type: 'integer', default: 1, minimum: 1 },
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    schema: { type: 'integer', default: 20, minimum: 1 },
  })
  @ApiQuery({ name: 'parentId', required: false })
  findAll(
    @Query() query: PaginationQueryDto & { parentId?: string; companyId?: string },
    @CurrentUser() user: any,
  ) {
    return this.service.findAll(query, user?.companyId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.findOne(id, user?.companyId);
  }

  @Patch(':id')
  @Roles('admin', 'inventory_manager')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProductCategoryDto,
    @CurrentUser() user: any,
  ) {
    return this.service.update(id, dto, user?.companyId);
  }

  @Delete(':id')
  @Roles('admin', 'inventory_manager')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.remove(id, user?.companyId);
  }
}
