import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class RejectPurchaseOrderDto {
  @ApiPropertyOptional({ example: "Budget exceeded or vendor terms rejected" })
  @IsOptional()
  @IsString()
  reason?: string;
}
