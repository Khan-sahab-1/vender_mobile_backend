import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CustomerInvoiceQueryDto } from './dto/customer-invoice-query.dto';
import { RegisterInvoicePaymentDto } from './dto/register-payment.dto';
import { CustomerInvoicesService } from './customer-invoices.service';

@ApiTags('Customer Invoices (account.move - out_invoice)')
@ApiBearerAuth()
@Controller('customer-invoices')
export class CustomerInvoicesController {
  constructor(private readonly service: CustomerInvoicesService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get Customer Invoices KPI stats' })
  getStats(@CurrentUser() user: any) {
    return this.service.getStats(user?.companyId);
  }

  @Get()
  @ApiOperation({ summary: 'List customer invoices with filters' })
  findAll(@Query() query: CustomerInvoiceQueryDto, @CurrentUser() user: any) {
    return this.service.findAll(query, user?.companyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get customer invoice by ID' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update draft customer invoice' })
  @Roles('admin', 'accountant', 'sales')
  update(@Param('id') id: string, @Body() dto: any) {
    return this.service.update(id, dto);
  }

  @Patch(':id/validate')
  @Post(':id/validate')
  @ApiOperation({
    summary:
      'Validate draft customer invoice, generate INV sequence, and create & post balanced account.move',
  })
  @Roles('admin', 'accountant', 'sales')
  validateInvoice(@Param('id') id: string) {
    return this.service.validateInvoice(id);
  }

  @Post(':id/register-payment')
  @ApiOperation({
    summary: 'Register payment from customer, post payment move, and reconcile',
  })
  @Roles('admin', 'accountant')
  registerPayment(
    @Param('id') id: string,
    @Body() dto: RegisterInvoicePaymentDto,
  ) {
    return this.service.registerPayment(id, dto);
  }

  @Patch(':id/cancel')
  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel customer invoice' })
  @Roles('admin', 'accountant')
  cancelInvoice(@Param('id') id: string) {
    return this.service.cancelInvoice(id);
  }
}

