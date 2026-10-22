import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional } from "class-validator";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";
import {
  AccountInternalGroup,
  AccountTypeCategory,
} from "../enums/account-type-category.enum";

export class AccountTypeQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: AccountTypeCategory,
    description: "Filter by category: regular, receivable, payable, liquidity",
  })
  @IsOptional()
  @IsEnum(AccountTypeCategory)
  type?: AccountTypeCategory;

  @ApiPropertyOptional({
    enum: AccountInternalGroup,
    description: "Filter by internal group: asset, liability, equity, income, expense, off_balance",
  })
  @IsOptional()
  @IsEnum(AccountInternalGroup)
  internalGroup?: AccountInternalGroup;

  @ApiPropertyOptional({ description: "Filter by Company ID" })
  @IsOptional()
  companyId?: string;
}

