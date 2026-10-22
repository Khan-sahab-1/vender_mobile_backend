import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsUUID } from "class-validator";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";
import { VendorBillState } from "../enums/vendor-bill.enum";

export class VendorBillQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: VendorBillState })
  @IsOptional()
  @IsEnum(VendorBillState)
  state?: VendorBillState;

  @ApiPropertyOptional({ description: "Filter by vendor ID (UUID)" })
  @IsOptional()
  @IsUUID()
  vendorId?: string;

  @ApiPropertyOptional({ description: "Filter by division ID (UUID)" })
  @IsOptional()
  @IsUUID()
  divisionId?: string;

  @ApiPropertyOptional({ description: "Filter by warehouse ID (UUID)" })
  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @ApiPropertyOptional({ description: "Filter by source purchase order ID (UUID)" })
  @IsOptional()
  @IsUUID()
  purchaseOrderId?: string;
}
