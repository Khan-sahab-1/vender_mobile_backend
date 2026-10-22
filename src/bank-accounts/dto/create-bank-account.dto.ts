import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateBankAccountDto {
  @ApiProperty({
    example: "HDFC Current Account",
    description: "Bank Account Name",
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: "HDFC Bank", description: "Bank Name" })
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiProperty({
    example: "50200012345678",
    description: "Bank Account Number",
  })
  @IsString()
  @IsNotEmpty()
  accountNumber: string;

  @ApiProperty({ example: "HDFC", description: "Bank Short Code" })
  @IsString()
  @IsNotEmpty()
  shortCode: string;

  @ApiPropertyOptional({
    default: true,
    description: "Manual tick for incoming/receivable customer receipts",
  })
  @IsOptional()
  @IsBoolean()
  receivable?: boolean;

  @ApiPropertyOptional({
    default: true,
    description: "Manual tick for outgoing/payable vendor payments",
  })
  @IsOptional()
  @IsBoolean()
  payable?: boolean;

  @ApiPropertyOptional({ default: "INR", description: "Currency" })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
