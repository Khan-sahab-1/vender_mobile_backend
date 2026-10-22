import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsOptional, IsPositive, IsString, IsUUID } from 'class-validator';

export class CreateStockMoveDto {
  @ApiProperty({ description: 'Product ID (UUID)' })
  @IsUUID()
  productId: string;

  @ApiPropertyOptional({ description: 'Unit of Measure ID (UUID) — defaults to the product UoM' })
  @IsOptional()
  @IsUUID()
  uomId?: string;

  @ApiProperty({ example: 10 })
  @IsNumber()
  @IsPositive()
  quantity: number;

  @ApiProperty({ description: 'Source Location ID (UUID)' })
  @IsUUID()
  sourceLocationId: string;

  @ApiProperty({ description: 'Destination Location ID (UUID)' })
  @IsUUID()
  destLocationId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  scheduledDate?: string;
}
