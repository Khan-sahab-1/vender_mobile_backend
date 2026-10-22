import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { ProductType } from '../entities/product.entity';

export class CreateProductDto {
  @ApiProperty({ example: 'Wireless Mouse' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'WM-1001' })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiPropertyOptional({ example: '8901234567890' })
  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiPropertyOptional({ enum: ProductType, default: ProductType.GOODS })
  @IsOptional()
  @IsEnum(ProductType)
  type?: ProductType;

  @ApiPropertyOptional({ enum: ['none', 'lot', 'serial'], default: 'none' })
  @IsOptional()
  @IsString()
  tracking?: string;

  @ApiPropertyOptional({ example: 'LOT-2026-001', description: 'Lot / Serial Number' })
  @IsOptional()
  @IsString()
  lotNumber?: string;

  @ApiPropertyOptional({ example: 'LOT-2026-001', description: 'Alias for lotNumber' })
  @IsOptional()
  @IsString()
  lotSerialNumber?: string;

  @ApiPropertyOptional({ description: 'Product Category ID (UUID)' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiProperty({ description: 'Unit of Measure ID (UUID)' })
  @IsUUID()
  uomId: string;

  @ApiPropertyOptional({ description: 'Purchase UoM ID (UUID), defaults to uomId' })
  @IsOptional()
  @IsUUID()
  purchaseUomId?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  salesPrice?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  costPrice?: number;

  @ApiPropertyOptional({ type: [String], description: 'Sales Tax IDs (UUID[])' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  salesTaxIds?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Purchase Tax IDs (UUID[])' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  purchaseTaxIds?: string[];

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  canBeSold?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  canBePurchased?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  weight?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  volume?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Company ID (UUID)' })
  @IsOptional()
  @IsUUID()
  companyId?: string;
}
