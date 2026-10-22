import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString, IsUUID } from "class-validator";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";
import { AccountType } from "../enums/account-account.enum";

export class AccountAccountQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ enum: AccountType })
  @IsOptional()
  @IsEnum(AccountType)
  type?: AccountType;

  @ApiPropertyOptional({ description: "Filter by Account Type ID" })
  @IsOptional()
  @IsUUID()
  accountTypeId?: string;

  @ApiPropertyOptional({ description: "Filter by Account Group ID" })
  @IsOptional()
  @IsUUID()
  groupId?: string;

  @ApiPropertyOptional({ description: "Filter by Company ID" })
  @IsOptional()
  @IsUUID()
  companyId?: string;
}

