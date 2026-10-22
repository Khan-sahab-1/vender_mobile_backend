import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from "typeorm";
import { BaseEntity } from "../../common/base.entity";
import { Company } from "../../companies/entities/company.entity";
import { AccountTypeEntity } from "../../account-types/entities/account-type.entity";

@Entity("account_groups")
export class AccountGroup extends BaseEntity {
  @Column()
  name: string;

  @Column({ name: "code_prefix", nullable: true })
  codePrefix: string;

  @Column({ name: "company_id", nullable: true })
  companyId?: string;

  @ManyToOne(() => Company, { nullable: true, onDelete: "CASCADE" })
  @JoinColumn({ name: "company_id" })
  company?: Company;

  @ManyToOne(() => AccountTypeEntity, { eager: true, nullable: true })
  @JoinColumn({ name: "account_type_id" })
  accountType: AccountTypeEntity;

  @Column({ name: "account_type_id", nullable: true })
  accountTypeId: string;

  @ManyToOne(() => AccountGroup, (g) => g.children, { nullable: true })
  @JoinColumn({ name: "parent_id" })
  parent: AccountGroup;

  @Column({ name: "parent_id", nullable: true })
  parentId: string;

  @OneToMany(() => AccountGroup, (g) => g.parent)
  children: AccountGroup[];
}


