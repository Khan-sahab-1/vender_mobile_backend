import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from "class-validator";
import { PurchaseOrderType } from "../enums/purchase-order.enum";
import { CreatePurchaseOrderLineDto } from "./create-purchase-order-line.dto";

export class CreatePurchaseOrderDto {
  @ApiPropertyOptional({
    enum: PurchaseOrderType,
    default: PurchaseOrderType.ADHOC,
    description: "PO Type: adhoc or regular",
  })
  @IsOptional()
  @IsEnum(PurchaseOrderType)
  type?: PurchaseOrderType;

  @ApiProperty({ description: "Vendor ID (UUID from partners)" })
  @IsUUID()
  vendorId: string;

  @ApiProperty({ description: "Warehouse ID (UUID)" })
  @IsUUID()
  warehouseId: string;

  @ApiProperty({ description: "Division ID (UUID)" })
  @IsUUID()
  divisionId: string;


  @ApiPropertyOptional({ example: "INR", default: "INR" })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({
    example: "2026-09-28T00:00:00.000Z",
    description: "Order date (defaults to current date)",
  })
  @IsOptional()
  @IsDateString()
  orderDate?: string;

  @ApiPropertyOptional({
    example: "2026-10-05T00:00:00.000Z",
    description: "Expected delivery date",
  })
  @IsOptional()
  @IsDateString()
  deliveryDate?: string;

  @ApiProperty({
    type: [CreatePurchaseOrderLineDto],
    description: "List of order lines",
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseOrderLineDto)
  lines: CreatePurchaseOrderLineDto[];

  @ApiPropertyOptional({
    example: "Urgent adhoc purchase for facility maintenance",
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
