import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { AccountAccount } from "../../account-accounts/entities/account-account.entity";
import { BaseEntity } from "../../common/base.entity";
import { Partner } from "../../partners/entities/partner.entity";
import { AccountMove } from "./account-move.entity";

@Entity("account_move_lines")
export class AccountMoveLine extends BaseEntity {
  @Column({ name: "move_id" })
  moveId: string;

  @ManyToOne(() => AccountMove, (move) => move.lines, { onDelete: "CASCADE" })
  @JoinColumn({ name: "move_id" })
  move: AccountMove;

  @Column({ name: "account_id" })
  accountId: string;

  @ManyToOne(() => AccountAccount)
  @JoinColumn({ name: "account_id" })
  account: AccountAccount;

  @Column({ name: "partner_id", nullable: true })
  partnerId?: string;

  @ManyToOne(() => Partner, { nullable: true })
  @JoinColumn({ name: "partner_id" })
  partner?: Partner;

  @Column({ nullable: true })
  name: string; // Label / description

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  debit: number;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  credit: number;

  @Column({ default: false })
  reconciled: boolean;

  @Column({ name: "matched_line_id", nullable: true })
  matchedLineId?: string;
}
