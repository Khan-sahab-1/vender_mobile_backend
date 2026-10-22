import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsUUID } from "class-validator";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";
import {
  PurchaseOrderState,
  PurchaseOrderType,
} from "../enums/purchase-order.enum";

export class PurchaseOrderQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: PurchaseOrderState })
  @IsOptional()
  @IsEnum(PurchaseOrderState)
  state?: PurchaseOrderState;

  @ApiPropertyOptional({ enum: PurchaseOrderType })
  @IsOptional()
  @IsEnum(PurchaseOrderType)
  type?: PurchaseOrderType;

  @ApiPropertyOptional({ description: "Filter by vendor ID (UUID)" })
  @IsOptional()
  @IsUUID()
  vendorId?: string;

  @ApiPropertyOptional({ description: "Filter by warehouse ID (UUID)" })
  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @ApiPropertyOptional({ description: "Filter by division ID (UUID)" })
  @IsOptional()
  @IsUUID()
  divisionId?: string;
}
