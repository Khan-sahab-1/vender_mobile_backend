import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional } from "class-validator";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";
import { AccountJournalType } from "../enums/account-journal.enum";

export class AccountJournalQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: AccountJournalType,
    description: "Filter by journal type: purchase, sale, bank, cash, general",
  })
  @IsOptional()
  @IsEnum(AccountJournalType)
  type?: AccountJournalType;
}
