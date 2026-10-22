import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../common/base.entity";
import { Company } from "../../companies/entities/company.entity";
import {
  AccountInternalGroup,
  AccountTypeCategory,
} from "../enums/account-type-category.enum";

@Entity("account_types")
@Index(["name", "companyId"], { unique: true })
export class AccountTypeEntity extends BaseEntity {
  @Column()
  name: string;

  @Column({ name: "company_id", nullable: true })
  companyId?: string;

  @ManyToOne(() => Company, { nullable: true, onDelete: "CASCADE" })
  @JoinColumn({ name: "company_id" })
  company?: Company;

  @Column({
    type: "enum",
    enum: AccountTypeCategory,
    default: AccountTypeCategory.REGULAR,
  })
  type: AccountTypeCategory;

  @Column({
    name: "internal_group",
    type: "enum",
    enum: AccountInternalGroup,
    default: AccountInternalGroup.ASSET,
  })
  internalGroup: AccountInternalGroup;

  @Column({ name: "include_initial_balance", default: true })
  includeInitialBalance: boolean;

  @Column({ type: "text", nullable: true })
  notes: string;
}


