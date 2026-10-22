import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  ValidateNested,
  ArrayMinSize,
} from "class-validator";
import { PickingType } from "../enums/stock-picking.enum";

export class CreatePickingMoveDto {
  @ApiProperty({ description: "Product ID (UUID)" })
  @IsUUID()
  productId: string;

  @ApiProperty({ example: 10 })
  @IsNumber()
  @IsPositive()
  quantity: number;

  @ApiPropertyOptional({
    description: "Unit of Measure ID (UUID) — defaults to the product UoM",
  })
  @IsOptional()
  @IsUUID()
  uomId?: string;
}

export class CreateStockPickingDto {
  @ApiPropertyOptional({
    enum: PickingType,
    description: "Required only when operationTypeId is not supplied.",
  })
  @IsOptional()
  @IsEnum(PickingType)
  pickingType?: PickingType;

  @ApiPropertyOptional({
    description:
      "Operation Type ID (UUID). Provides warehouse, locations, and sequence defaults.",
  })
  @IsOptional()
  @IsUUID()
  operationTypeId?: string;

  @ApiPropertyOptional({ description: "Warehouse ID (UUID)" })
  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @ApiPropertyOptional({
    description:
      "Source Location ID (UUID). Overrides the operation type default.",
  })
  @IsOptional()
  @IsUUID()
  sourceLocationId?: string;

  @ApiPropertyOptional({
    description:
      "Destination Location ID (UUID). Overrides the operation type default.",
  })
  @IsOptional()
  @IsUUID()
  destLocationId?: string;

  @ApiPropertyOptional({
    description: "Vendor (receipt) or Customer (delivery) Partner ID (UUID)",
  })
  @IsOptional()
  @IsUUID()
  partnerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  scheduledDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  origin?: string;

  @ApiProperty({ type: [CreatePickingMoveDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreatePickingMoveDto)
  moves: CreatePickingMoveDto[];
}
