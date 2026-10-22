import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsUUID } from "class-validator";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";

export class AccountGroupQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: "Filter by code prefix (e.g. 10, 20)" })
  @IsOptional()
  @IsString()
  codePrefix?: string;

  @ApiPropertyOptional({ description: "Filter by Account Type ID" })
  @IsOptional()
  @IsUUID()
  accountTypeId?: string;

  @ApiPropertyOptional({ description: "Filter by Company ID" })
  @IsOptional()
  @IsUUID()
  companyId?: string;
}

