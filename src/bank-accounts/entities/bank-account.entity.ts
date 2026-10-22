import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../common/base.entity";
import { AccountJournal } from "../../account-journals/entities/account-journal.entity";

@Entity("bank_accounts")
export class BankAccount extends BaseEntity {
  @Column()
  name: string; // Bank Account Name (e.g. "HDFC Current Account")

  @Column({ name: "bank_name", nullable: true })
  bankName?: string; // Bank Name (e.g. "HDFC Bank")

  @Column({ name: "account_number" })
  accountNumber: string; // Account Number (e.g. "50200012345678")

  @Column({ name: "short_code" })
  shortCode: string; // Bank Short Code (e.g. "HDFC", "BNK1")

  @Column({ default: true })
  receivable: boolean; // Manual tick: incoming customer receipts

  @Column({ default: true })
  payable: boolean; // Manual tick: outgoing vendor payments

  @Column({ default: "INR" })
  currency: string;

  @Column({ name: "journal_id", nullable: true })
  journalId?: string;

  @ManyToOne(() => AccountJournal, {
    nullable: true,
    eager: true,
    onDelete: "SET NULL",
  })
  @JoinColumn({ name: "journal_id" })
  journal?: AccountJournal;
}
