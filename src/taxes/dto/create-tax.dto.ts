import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { TaxAmountType, TaxTypeUse } from '../entities/tax.entity';

export class CreateTaxDto {
  @ApiProperty({ example: 'GST 18%' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'GST18' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ enum: TaxAmountType, default: TaxAmountType.PERCENT })
  @IsOptional()
  @IsEnum(TaxAmountType)
  amountType?: TaxAmountType;

  @ApiProperty({ example: 18 })
  @IsNumber()
  amount: number;

  @ApiPropertyOptional({ enum: TaxTypeUse, default: TaxTypeUse.SALE })
  @IsOptional()
  @IsEnum(TaxTypeUse)
  typeTaxUse?: TaxTypeUse;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  priceIncluded?: boolean;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @IsNumber()
  sequence?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}
