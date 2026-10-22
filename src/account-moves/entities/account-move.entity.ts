import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from "typeorm";
import { AccountJournal } from "../../account-journals/entities/account-journal.entity";
import { BaseEntity } from "../../common/base.entity";
import { Partner } from "../../partners/entities/partner.entity";
import { AccountMoveState, AccountMoveType } from "../enums/account-move.enum";
import { AccountMoveLine } from "./account-move-line.entity";

@Entity("account_moves")
export class AccountMove extends BaseEntity {
  @Column({ name: "name", unique: true })
  name: string; // Entry number, e.g. BILL/2026/00001 or BNK1/2026/00001

  @Column({ name: "journal_id" })
  journalId: string;

  @ManyToOne(() => AccountJournal)
  @JoinColumn({ name: "journal_id" })
  journal: AccountJournal;

  @Column({
    name: "move_type",
    type: "enum",
    enum: AccountMoveType,
    default: AccountMoveType.ENTRY,
  })
  moveType: AccountMoveType;

  @Column({
    type: "enum",
    enum: AccountMoveState,
    default: AccountMoveState.DRAFT,
  })
  state: AccountMoveState;

  @Column({ type: "date" })
  date: Date;

  @Column({ nullable: true })
  ref?: string; // Reference, e.g. Bill Number or Cheque/UTR number

  @Column({ name: "partner_id", nullable: true })
  partnerId?: string;

  @ManyToOne(() => Partner, { nullable: true })
  @JoinColumn({ name: "partner_id" })
  partner?: Partner;

  @Column({ name: "amount_total", type: "decimal", precision: 12, scale: 2, default: 0 })
  amountTotal: number;

  @OneToMany(() => AccountMoveLine, (line) => line.move, { cascade: true })
  lines: AccountMoveLine[];
}
