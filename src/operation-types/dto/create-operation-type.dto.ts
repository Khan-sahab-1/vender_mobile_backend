import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from "class-validator";
import { PickingType } from "../../stock-pickings/enums/stock-picking.enum";

export class CreateOperationTypeDto {
  @ApiProperty({ example: "Receipts" })
  @IsString()
  name: string;

  @ApiProperty({
    enum: PickingType,
    example: PickingType.RECEIPT,
    description:
      "Type of Operation: receipt (Vendor / Inbound goods), delivery (Customer / Outbound goods), internal (Internal Transfer), return (Customer or Vendor Return)",
  })
  @IsEnum(PickingType)
  pickingType: PickingType;

  @ApiProperty({ description: "Warehouse ID (UUID)" })
  @IsUUID()
  warehouseId: string;

  @ApiProperty({ description: "Default source location ID (UUID)" })
  @IsUUID()
  defaultSourceLocationId: string;

  @ApiProperty({ description: "Default destination location ID (UUID)" })
  @IsUUID()
  defaultDestLocationId: string;

  @ApiPropertyOptional({ example: "IN" })
  @IsOptional()
  @IsString()
  sequencePrefix?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ description: "Company ID (UUID)" })
  @IsOptional()
  @IsUUID()
  companyId?: string;
}
