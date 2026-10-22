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
import { UomCategoryService } from './uom-category.service';
import { UomService } from './uom.service';
import { CreateUomCategoryDto } from './dto/create-uom-category.dto';
import { UpdateUomCategoryDto } from './dto/update-uom-category.dto';
import { CreateUomDto } from './dto/create-uom.dto';
import { UpdateUomDto } from './dto/update-uom.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('UoM Categories')
@ApiBearerAuth()
@Controller('uom-categories')
export class UomCategoryController {
  constructor(private readonly service: UomCategoryService) {}

  @Post()
  @Roles('admin', 'inventory_manager')
  create(@Body() dto: CreateUomCategoryDto, @CurrentUser() user: any) {
    return this.service.create(dto, user?.companyId);
  }

  @Get()
  findAll(
    @Query() query: PaginationQueryDto & { companyId?: string },
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
    @Body() dto: UpdateUomCategoryDto,
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

@ApiTags('Units of Measure')
@ApiBearerAuth()
@Controller('uoms')
export class UomController {
  constructor(private readonly service: UomService) {}

  @Post()
  @Roles('admin', 'inventory_manager')
  create(@Body() dto: CreateUomDto, @CurrentUser() user: any) {
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
  @ApiQuery({ name: 'categoryId', required: false })
  findAll(
    @Query() query: PaginationQueryDto & { categoryId?: string; companyId?: string },
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
    @Body() dto: UpdateUomDto,
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
