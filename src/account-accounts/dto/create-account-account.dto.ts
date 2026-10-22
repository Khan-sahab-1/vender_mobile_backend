import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from "class-validator";
import { AccountType } from "../enums/account-account.enum";

export class CreateAccountAccountDto {
  @ApiProperty({ example: "211000", description: "Account Code" })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: "Accounts Payable", description: "Account Name" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: "Account Type ID (from account-types)",
  })
  @IsOptional()
  @IsUUID()
  accountTypeId?: string;

  @ApiPropertyOptional({
    description: "Account Group ID (from account-groups)",
  })
  @IsOptional()
  @IsUUID()
  groupId?: string;

  @ApiPropertyOptional({
    enum: AccountType,
    example: AccountType.PAYABLE,
    description:
      "Internal Account Type enum (optional, auto-derived from Account Type)",
  })
  @IsOptional()
  @IsEnum(AccountType)
  type?: AccountType;

  @ApiPropertyOptional({ default: false, description: "Allow reconciliation" })
  @IsOptional()
  @IsBoolean()
  reconcile?: boolean;

  @ApiPropertyOptional({ default: "INR", description: "Currency" })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ description: "Company ID (UUID)" })
  @IsOptional()
  @IsUUID()
  companyId?: string;
}

