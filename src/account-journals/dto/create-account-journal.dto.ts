import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsNotEmpty, IsString } from "class-validator";
import { AccountJournalType } from "../enums/account-journal.enum";

export class CreateAccountJournalDto {
  @ApiProperty({ example: "Vendor Bills", description: "Journal Name" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    enum: AccountJournalType,
    example: AccountJournalType.PURCHASE,
    description: "Journal Type: purchase, sale, bank, cash, general",
  })
  @IsEnum(AccountJournalType)
  type: AccountJournalType;

  @ApiProperty({ example: "BILL", description: "Short unique journal code" })
  @IsString()
  @IsNotEmpty()
  code: string;
}
