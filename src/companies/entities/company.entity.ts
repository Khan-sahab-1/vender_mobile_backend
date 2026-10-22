import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';
import { User } from '../../users/entities/user.entity';

export enum CompanyStructureType {
  PVT_LTD = 'pvt_ltd',
  LLC = 'llc',
  PROPRIETORSHIP = 'proprietorship',
  PARTNERSHIP = 'partnership',
  OTHER = 'other',
}

@Entity('companies')
export class Company extends BaseEntity {
  @Column()
  name: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: CompanyStructureType.PVT_LTD,
    name: 'company_type',
  })
  companyType: string;

  @Column({ nullable: true })
  code: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  street: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  state: string;

  @Column({ nullable: true, default: 'India' })
  country: string;

  @Column({ nullable: true })
  zip: string;

  @Column({ default: 'INR' })
  currency: string;

  @Column({ nullable: true })
  gstin: string;

  @Column({ nullable: true, name: 'logo_url' })
  logoUrl: string;

  @OneToMany(() => User, (user) => user.company)
  users: User[];
}
