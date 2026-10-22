import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsBoolean, IsEnum, IsOptional, IsUUID } from "class-validator";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";
import { PickingType } from "../../stock-pickings/enums/stock-picking.enum";

export class OperationTypeQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: PickingType,
    description:
      "Type of operation: receipt (Vendor/Inbound), delivery (Customer/Outbound), internal (Internal Transfer), return (Return)",
  })
  @IsOptional()
  @IsEnum(PickingType)
  pickingType?: PickingType;

  @ApiPropertyOptional({ description: "Filter by warehouse ID (UUID)" })
  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @ApiPropertyOptional({ description: "Filter by active status" })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ description: "Filter by company ID (UUID)" })
  @IsOptional()
  @IsUUID()
  companyId?: string;
}
