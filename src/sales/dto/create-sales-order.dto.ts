import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SalesOrderType } from '../enums/sales-order.enum';

export class CreateSalesOrderLineDto {
  @ApiProperty({ description: 'Product UUID' })
  @IsString()
  productId: string;

  @ApiPropertyOptional({ description: 'Line item description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Ordered quantity', default: 1 })
  @IsNumber()
  quantity: number;

  @ApiProperty({ description: 'Unit selling price', default: 0 })
  @IsNumber()
  unitPrice: number;

  @ApiPropertyOptional({ description: 'Discount percentage (0-100)', default: 0 })
  @IsOptional()
  @IsNumber()
  discount?: number;

  @ApiPropertyOptional({ description: 'Tax UUID' })
  @IsOptional()
  @IsString()
  taxId?: string;
}

export class CreateSalesOrderDto {
  @ApiProperty({ description: 'Division UUID' })
  @IsString()
  divisionId: string;

  @ApiProperty({ description: 'Customer (Partner) UUID' })
  @IsString()
  customerId: string;

  @ApiPropertyOptional({ description: 'Delivery Address' })
  @IsOptional()
  @IsString()
  deliveryAddress?: string;

  @ApiPropertyOptional({ description: 'Client PO Reference Number' })
  @IsOptional()
  @IsString()
  poRefNo?: string;

  @ApiPropertyOptional({ description: 'Client PO Date (ISO string or YYYY-MM-DD)' })
  @IsOptional()
  clientPoDate?: Date | string;

  @ApiPropertyOptional({ description: 'Order Date (default today)' })
  @IsOptional()
  orderDate?: Date | string;

  @ApiProperty({ description: 'Warehouse UUID' })
  @IsString()
  warehouseId: string;

  @ApiPropertyOptional({ description: 'Pricelist UUID' })
  @IsOptional()
  @IsString()
  pricelistId?: string;

  @ApiPropertyOptional({ description: 'Payment Term UUID' })
  @IsOptional()
  @IsString()
  paymentTermId?: string;

  @ApiPropertyOptional({
    description: 'Order Type',
    enum: SalesOrderType,
    default: SalesOrderType.ADHOC,
  })
  @IsOptional()
  @IsEnum(SalesOrderType)
  orderType?: SalesOrderType;

  @ApiPropertyOptional({ description: 'Transporter Partner UUID' })
  @IsOptional()
  @IsString()
  transporterId?: string;

  @ApiPropertyOptional({ description: 'Transporter Name' })
  @IsOptional()
  @IsString()
  transporterName?: string;

  @ApiPropertyOptional({ description: 'Delivery Days (e.g. 7)' })
  @IsOptional()
  @IsNumber()
  deliveryDays?: number;

  @ApiPropertyOptional({ description: 'Expected Delivery Date' })
  @IsOptional()
  deliveryDate?: Date | string;

  @ApiPropertyOptional({ description: 'Order Notes / Terms' })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({ description: 'Order Lines', type: [CreateSalesOrderLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSalesOrderLineDto)
  lines: CreateSalesOrderLineDto[];
}

