import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { UomType } from '../entities/uom.entity';

export class CreateUomDto {
  @ApiProperty({ example: 'Kilogram' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'kg' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({ description: 'UoM Category ID (UUID)' })
  @IsUUID()
  categoryId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  companyId?: string;

  @ApiPropertyOptional({ enum: UomType, default: UomType.REFERENCE })
  @IsOptional()
  @IsEnum(UomType)
  uomType?: UomType;

  @ApiPropertyOptional({ default: 1, description: 'Ratio relative to category reference unit' })
  @IsOptional()
  @IsNumber()
  @Min(0.000001)
  factor?: number;

  @ApiPropertyOptional({ default: 0.01 })
  @IsOptional()
  @IsNumber()
  rounding?: number;
}
