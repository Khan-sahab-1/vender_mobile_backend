import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../common/base.entity";
import { Company } from "../../companies/entities/company.entity";
import { AccountType } from "../enums/account-account.enum";
import { AccountTypeEntity } from "../../account-types/entities/account-type.entity";
import { AccountGroup } from "../../account-groups/entities/account-group.entity";

@Entity("account_accounts")
@Index(["code", "companyId"], { unique: true })
export class AccountAccount extends BaseEntity {
  @Column()
  code: string;

  @Column()
  name: string;

  @Column({ name: "company_id", nullable: true })
  companyId?: string;

  @ManyToOne(() => Company, { nullable: true, onDelete: "CASCADE" })
  @JoinColumn({ name: "company_id" })
  company?: Company;

  @ManyToOne(() => AccountTypeEntity, { eager: true, nullable: true })
  @JoinColumn({ name: "account_type_id" })
  accountType?: AccountTypeEntity;

  @Column({ name: "account_type_id", nullable: true })
  accountTypeId?: string;

  @ManyToOne(() => AccountGroup, { eager: true, nullable: true })
  @JoinColumn({ name: "group_id" })
  group?: AccountGroup;

  @Column({ name: "group_id", nullable: true })
  groupId?: string;

  /**
   * Internal type enum (kept for backwards compatibility)
   */
  @Column({
    type: "enum",
    enum: AccountType,
    default: AccountType.EXPENSE,
  })
  type: AccountType;

  @Column({ default: false })
  reconcile: boolean;

  @Column({ default: "INR" })
  currency: string;
}


