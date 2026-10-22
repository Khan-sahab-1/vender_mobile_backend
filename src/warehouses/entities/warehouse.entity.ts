import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';

@Entity('warehouses')
export class Warehouse extends BaseEntity {
  @Column()
  name: string;

  @Column({ nullable: true })
  code: string; // short code, like Odoo's warehouse code (e.g. "WH", "WH2")

  @Column({ name: 'company_id', nullable: true })
  companyId?: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  country: string;

  @Column({ nullable: true, name: 'contact_phone' })
  phone: string;
}
