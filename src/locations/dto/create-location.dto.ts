import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { LocationUsage } from '../entities/location.entity';

export class CreateLocationDto {
  @ApiProperty({ example: 'Shelf A1' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Parent Location ID (UUID)' })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiPropertyOptional({ description: 'Warehouse ID (UUID)' })
  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @ApiPropertyOptional({ enum: LocationUsage, default: LocationUsage.INTERNAL })
  @IsOptional()
  @IsEnum(LocationUsage)
  usage?: LocationUsage;

  @ApiPropertyOptional({ description: 'Company ID (UUID)' })
  @IsOptional()
  @IsUUID()
  companyId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  barcode?: string;
}
