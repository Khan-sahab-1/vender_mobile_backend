import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { CustomerInvoiceState } from '../enums/customer-invoice.enum';

export class CustomerInvoiceQueryDto {
  @ApiPropertyOptional({ description: 'Filter by state', enum: CustomerInvoiceState })
  @IsOptional()
  @IsEnum(CustomerInvoiceState)
  state?: CustomerInvoiceState;

  @ApiPropertyOptional({ description: 'Filter by customer ID' })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({ description: 'Search term (number, customer, reference)' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Page limit', default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 50;

  @ApiPropertyOptional({ description: 'Page offset', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  offset?: number = 0;
}

