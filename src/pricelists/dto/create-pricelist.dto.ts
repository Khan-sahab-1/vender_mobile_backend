import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  PricelistAppliedOn,
  PricelistComputeType,
} from '../entities/pricelist.entity';

export class CreatePricelistItemDto {
  @ApiPropertyOptional({ enum: PricelistAppliedOn, default: PricelistAppliedOn.ALL_PRODUCTS })
  @IsOptional()
  @IsEnum(PricelistAppliedOn)
  appliedOn?: PricelistAppliedOn;

  @ApiPropertyOptional({ description: 'Required when appliedOn = product' })
  @IsOptional()
  @IsUUID()
  productId?: string;

  @ApiPropertyOptional({ description: 'Required when appliedOn = category' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ enum: PricelistComputeType, default: PricelistComputeType.FIXED })
  @IsOptional()
  @IsEnum(PricelistComputeType)
  computeType?: PricelistComputeType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  fixedPrice?: number;

  @ApiPropertyOptional({ description: 'Positive = markup %, negative = discount %' })
  @IsOptional()
  @IsNumber()
  percentage?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minQuantity?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateStart?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateEnd?: string;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @IsNumber()
  sequence?: number;
}

export class CreatePricelistDto {
  @ApiProperty({ example: 'Wholesale Pricelist' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ default: 'USD' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ type: [CreatePricelistItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePricelistItemDto)
  items?: CreatePricelistItemDto[];
}
