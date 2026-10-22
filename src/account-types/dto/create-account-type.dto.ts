import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from "class-validator";
import {
  AccountInternalGroup,
  AccountTypeCategory,
} from "../enums/account-type-category.enum";

export class CreateAccountTypeDto {
  @ApiProperty({ example: "Bank and Cash" })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    enum: AccountTypeCategory,
    example: AccountTypeCategory.LIQUIDITY,
  })
  @IsNotEmpty()
  @IsEnum(AccountTypeCategory)
  type: AccountTypeCategory;

  @ApiPropertyOptional({
    enum: AccountInternalGroup,
    example: AccountInternalGroup.ASSET,
    default: AccountInternalGroup.ASSET,
  })
  @IsOptional()
  @IsEnum(AccountInternalGroup)
  internalGroup?: AccountInternalGroup;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  includeInitialBalance?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ description: "Company ID (UUID)" })
  @IsOptional()
  @IsString()
  companyId?: string;
}

