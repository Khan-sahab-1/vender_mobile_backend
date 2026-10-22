import { Column, Entity } from "typeorm";
import { BaseEntity } from "../../common/base.entity";
import { AccountJournalType } from "../enums/account-journal.enum";

@Entity("account_journals")
export class AccountJournal extends BaseEntity {
  @Column()
  name: string;

  @Column({
    type: "enum",
    enum: AccountJournalType,
    default: AccountJournalType.GENERAL,
  })
  type: AccountJournalType;

  @Column({ unique: true })
  code: string;
}
