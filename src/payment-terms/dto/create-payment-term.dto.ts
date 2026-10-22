import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaymentTermLineValueType } from '../entities/payment-term.entity';

export class CreatePaymentTermLineDto {
  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @IsInt()
  sequence?: number;

  @ApiProperty({ enum: PaymentTermLineValueType })
  @IsEnum(PaymentTermLineValueType)
  valueType: PaymentTermLineValueType;

  @ApiPropertyOptional({ description: 'Percent (0-100) or fixed amount' })
  @IsOptional()
  @IsNumber()
  value?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  daysDue?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  endOfMonth?: boolean;
}

export class CreatePaymentTermDto {
  @ApiProperty({ example: '30 Days' })
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({ type: [CreatePaymentTermLineDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePaymentTermLineDto)
  lines: CreatePaymentTermLineDto[];
}
