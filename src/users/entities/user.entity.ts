import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { Exclude } from 'class-transformer';
import { BaseEntity } from '../../common/base.entity';
import { Role } from '../../roles/entities/role.entity';
import { Partner } from '../../partners/entities/partner.entity';
import { Company } from '../../companies/entities/company.entity';

export enum UserClassification {
  INTERNAL = 'internal',
  EXTERNAL = 'external',
}

export enum UserType {
  COMPANY_ADMIN = 'company_admin',
  INDIVIDUAL = 'individual',
  INTERNAL = 'internal',
  EXTERNAL = 'external',
}


@Entity('users')
@Unique('uq_users_email_company', ['email', 'companyId'])
export class User extends BaseEntity {
  @Column()
  name: string;

  @Column()
  email: string;

  @Column()
  @Exclude()
  password: string;

  @Column({ nullable: true })
  phone: string;

  @Column({
    type: 'varchar',
    length: 30,
    default: UserClassification.INTERNAL,
    name: 'user_type',
  })
  userType: string;

  /**
   * Module Access Rights:
   * sale: 'none' | 'user' | 'manager' | 'management'
   * inventory: 'none' | 'user' | 'manager' | 'management'
   * purchase: 'none' | 'user' | 'manager' | 'management'
   * accounting: 'none' | 'user' | 'manager' | 'management'
   */
  @Column({
    type: 'jsonb',
    nullable: true,
    default: {
      sale: 'manager',
      inventory: 'manager',
      purchase: 'manager',
      accounting: 'manager',
    },
    name: 'access_rights',
  })
  accessRights: Record<string, string>;

  @Column({ default: false, name: 'is_admin' })
  isAdmin: boolean;

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

  @Column({ nullable: true, name: 'avatar_url' })
  avatarUrl: string;

  @ManyToOne(() => Role, (role) => role.users, { eager: true, nullable: true })
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @Column({ name: 'role_id', nullable: true })
  roleId: string;

  @ManyToOne(() => Company, (company) => company.users, { eager: true, nullable: true })
  @JoinColumn({ name: 'company_id' })
  company?: Company;

  @Column({ name: 'company_id', nullable: true })
  companyId?: string;

  @ManyToOne(() => Partner, { eager: true, nullable: true })
  @JoinColumn({ name: 'partner_id' })
  partner?: Partner;

  @Column({ name: 'partner_id', nullable: true })
  partnerId?: string;

  @Column({ name: 'last_login', type: 'timestamp', nullable: true })
  lastLogin: Date;
}
