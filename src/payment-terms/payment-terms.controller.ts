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
import { PaymentTermsService } from './payment-terms.service';
import { CreatePaymentTermDto } from './dto/create-payment-term.dto';
import { UpdatePaymentTermDto } from './dto/update-payment-term.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Payment Terms')
@ApiBearerAuth()
@Controller('payment-terms')
export class PaymentTermsController {
  constructor(private readonly service: PaymentTermsService) {}

  @Post()
  @Roles('admin', 'accountant')
  create(@Body() dto: CreatePaymentTermDto) {
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

  @Patch(':id')
  @Roles('admin', 'accountant')
  update(@Param('id') id: string, @Body() dto: UpdatePaymentTermDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles('admin', 'accountant')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
