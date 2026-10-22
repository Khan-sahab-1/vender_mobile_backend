import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional } from "class-validator";
import { Transform } from "class-transformer";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";

export class BankAccountQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: "Filter by receivable (incoming receipts)",
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === "true" || value === true)
  receivable?: boolean;

  @ApiPropertyOptional({
    description: "Filter by payable (outgoing payments)",
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === "true" || value === true)
  payable?: boolean;
}
