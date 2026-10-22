import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNumber, IsOptional, IsString } from "class-validator";

export class UpdateInventoryAdjustmentLineDto {
  @ApiPropertyOptional({ description: "Physically counted quantity" })
  @IsOptional()
  @IsNumber()
  countedQuantity?: number;

  @ApiPropertyOptional({ description: "Adjustment quantity delta (+/-) starting at 0" })
  @IsOptional()
  @IsNumber()
  adjustmentQuantity?: number;

  @ApiPropertyOptional({ description: "Lot or serial number" })
  @IsOptional()
  @IsString()
  lotNumber?: string;

  @ApiPropertyOptional({ description: "Reason for stock adjustment (required if minus/reduction)" })
  @IsOptional()
  @IsString()
  reason?: string;
}

