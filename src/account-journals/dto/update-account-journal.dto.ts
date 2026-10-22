import { PartialType } from "@nestjs/swagger";
import { CreateAccountJournalDto } from "./create-account-journal.dto";

export class UpdateAccountJournalDto extends PartialType(
  CreateAccountJournalDto,
) {}
