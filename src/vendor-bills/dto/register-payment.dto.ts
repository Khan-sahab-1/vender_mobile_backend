import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsNumber, IsOptional, IsPositive, IsString, IsUUID } from "class-validator";

export class RegisterPaymentDto {
  @ApiProperty({ description: "Payment Journal ID (Bank or Cash Journal UUID)" })
  @IsUUID()
  journalId: string;

  @ApiPropertyOptional({ example: 283.20, description: "Payment amount (defaults to residual balance)" })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  amount?: number;

  @ApiPropertyOptional({ example: "2026-09-28T00:00:00.000Z", description: "Payment Date" })
  @IsOptional()
  @IsDateString()
  paymentDate?: string;

  @ApiPropertyOptional({ example: "UTR12345678 or Cheque #98101", description: "Payment Reference / Memo" })
  @IsOptional()
  @IsString()
  reference?: string;
}
