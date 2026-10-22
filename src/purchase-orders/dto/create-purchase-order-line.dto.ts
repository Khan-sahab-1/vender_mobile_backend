import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Min,
} from "class-validator";

export class CreatePurchaseOrderLineDto {
  @ApiPropertyOptional({ description: "Product ID (UUID)" })
  @IsOptional()
  @IsUUID()
  productId?: string;

  @ApiPropertyOptional({ example: "Adhoc office supplies or repair service" })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 10 })
  @IsNumber()
  @IsPositive()
  quantity: number;

  @ApiProperty({ example: 500 })
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiPropertyOptional({ description: "UoM ID (UUID)" })
  @IsOptional()
  @IsUUID()
  uomId?: string;

  @ApiPropertyOptional({ description: "Tax ID (UUID)" })
  @IsOptional()
  @IsUUID()
  taxId?: string;
}
