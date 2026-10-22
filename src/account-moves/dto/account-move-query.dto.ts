import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsEnum, IsOptional, IsUUID } from "class-validator";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";
import { AccountMoveState, AccountMoveType } from "../enums/account-move.enum";

export class AccountMoveQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: AccountMoveState })
  @IsOptional()
  @IsEnum(AccountMoveState)
  state?: AccountMoveState;

  @ApiPropertyOptional({ enum: AccountMoveType })
  @IsOptional()
  @IsEnum(AccountMoveType)
  moveType?: AccountMoveType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  journalId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  partnerId?: string;

  @ApiPropertyOptional({ example: "2026-01-01" })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ example: "2026-12-31" })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
