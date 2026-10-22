import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from "class-validator";

export class CreateAccountGroupDto {
  @ApiProperty({ example: "Current Assets" })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: "10" })
  @IsOptional()
  @IsString()
  codePrefix?: string;

  @ApiPropertyOptional({
    description: "Linked Account Type ID (e.g. Bank and Cash, Receivable)",
  })
  @IsOptional()
  @IsUUID()
  accountTypeId?: string;

  @ApiPropertyOptional({ description: "Parent Group ID for hierarchical chart" })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ description: "Company ID (UUID)" })
  @IsOptional()
  @IsUUID()
  companyId?: string;
}

