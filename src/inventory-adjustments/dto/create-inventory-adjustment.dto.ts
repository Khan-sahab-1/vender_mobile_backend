import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from "class-validator";
import {
  InventoryOf,
  InventoryType,
} from "../entities/inventory-adjustment.entity";

export class CreateInventoryAdjustmentLineDto {
  @ApiProperty({ description: "Product ID (UUID)" })
  @IsUUID()
  productId: string;

  @ApiPropertyOptional({ description: "Location ID (UUID)" })
  @IsOptional()
  @IsUUID()
  locationId?: string;

  @ApiPropertyOptional({
    description: "Physically counted quantity (Real Quantity)",
  })
  @IsOptional()
  @IsNumber()
  countedQuantity?: number;

  @ApiPropertyOptional({
    description: "Adjustment quantity delta (+/-) starting at 0",
  })
  @IsOptional()
  @IsNumber()
  adjustmentQuantity?: number;

  @ApiPropertyOptional({ description: "Lot/Serial Number" })
  @IsOptional()
  @IsString()
  lotNumber?: string;

  @ApiPropertyOptional({ description: "Reason for stock adjustment (required if minus/reduction)" })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class CreateInventoryAdjustmentDto {
  @ApiPropertyOptional({ description: "Inventory Reference", example: "2026/001" })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional({ example: "Annual Stock Count 2026" })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: "Warehouse ID (UUID)",
  })
  @IsUUID()
  warehouseId: string;

  @ApiPropertyOptional({ description: "Inventoried Location ID (UUID)" })
  @IsOptional()
  @IsUUID()
  locationId?: string;

  @ApiPropertyOptional({
    enum: InventoryType,
    default: InventoryType.STOCK_INVENTORY,
    description: "Inventory Type: stock_inventory or stock_journal",
  })
  @IsOptional()
  @IsEnum(InventoryType)
  inventoryType?: InventoryType;

  @ApiPropertyOptional({
    enum: InventoryOf,
    default: InventoryOf.ALL_PRODUCTS,
    description: "Inventory of: all_products, category, product, or lot",
  })
  @IsOptional()
  @IsEnum(InventoryOf)
  inventoryOf?: InventoryOf;

  @ApiPropertyOptional({ description: "Category ID if inventoryOf is category" })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ description: "Product ID if inventoryOf is product" })
  @IsOptional()
  @IsUUID()
  productId?: string;

  @ApiPropertyOptional({ description: "Lot/Serial Number if inventoryOf is lot" })
  @IsOptional()
  @IsString()
  lotNumber?: string;

  @ApiPropertyOptional({ description: "Inventory Date (YYYY-MM-DD)" })
  @IsOptional()
  @IsString()
  inventoryDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: "If true, immediately start inventory" })
  @IsOptional()
  startImmediately?: boolean;

  @ApiPropertyOptional({ type: [CreateInventoryAdjustmentLineDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInventoryAdjustmentLineDto)
  lines?: CreateInventoryAdjustmentLineDto[];
}

