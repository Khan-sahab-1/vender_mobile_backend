import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';

export class RegisterInvoicePaymentDto {
  @ApiProperty({ description: 'Payment Journal ID (Bank or Cash Journal UUID)' })
  @IsUUID()
  journalId: string;

  @ApiPropertyOptional({
    example: 5000,
    description: 'Payment amount (defaults to residual balance)',
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  amount?: number;

  @ApiPropertyOptional({
    example: '2026-10-21T00:00:00.000Z',
    description: 'Payment Date',
  })
  @IsOptional()
  @IsDateString()
  paymentDate?: string;

  @ApiPropertyOptional({
    example: 'NEFT/UPI/Cheque #123456',
    description: 'Payment Reference / Memo',
  })
  @IsOptional()
  @IsString()
  reference?: string;
}

