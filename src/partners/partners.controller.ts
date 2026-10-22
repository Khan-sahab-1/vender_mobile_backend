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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PartnersService } from './partners.service';
import { CreatePartnerDto } from './dto/create-partner.dto';
import { UpdatePartnerDto } from './dto/update-partner.dto';
import { PartnerQueryDto } from './dto/partner-query.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Partners')
@ApiBearerAuth()
@Controller('partners')
export class PartnersController {
  constructor(private readonly service: PartnersService) {}

  @Post()
  @Roles('admin', 'sales_manager', 'purchase_manager')
  create(@Body() dto: CreatePartnerDto, @CurrentUser() user: any) {
    return this.service.create(dto, user?.companyId);
  }

  @Get()
  findAll(@Query() query: PartnerQueryDto, @CurrentUser() user: any) {
    return this.service.findAll(query, undefined, user?.companyId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @Roles('admin', 'sales_manager', 'purchase_manager')
  update(@Param('id') id: string, @Body() dto: UpdatePartnerDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles('admin', 'sales_manager', 'purchase_manager')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}

@ApiTags('Customers')
@ApiBearerAuth()
@Controller('customers')
export class CustomersController {
  constructor(private readonly service: PartnersService) {}

  @Post()
  @Roles('admin', 'sales_manager')
  create(@Body() dto: CreatePartnerDto, @CurrentUser() user: any) {
    return this.service.create({ ...dto, isCustomer: true }, user?.companyId);
  }

  @Get()
  findAll(@Query() query: PartnerQueryDto, @CurrentUser() user: any) {
    return this.service.findAll(query, 'customer', user?.companyId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @Roles('admin', 'sales_manager')
  update(@Param('id') id: string, @Body() dto: UpdatePartnerDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles('admin', 'sales_manager')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}

@ApiTags('Vendors')
@ApiBearerAuth()
@Controller('vendors')
export class VendorsController {
  constructor(private readonly service: PartnersService) {}

  @Post()
  @Roles('admin', 'purchase_manager')
  create(@Body() dto: CreatePartnerDto, @CurrentUser() user: any) {
    return this.service.create({ ...dto, isVendor: true }, user?.companyId);
  }

  @Get()
  findAll(@Query() query: PartnerQueryDto, @CurrentUser() user: any) {
    return this.service.findAll(query, 'vendor', user?.companyId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @Roles('admin', 'purchase_manager')
  update(@Param('id') id: string, @Body() dto: UpdatePartnerDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles('admin', 'purchase_manager')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
