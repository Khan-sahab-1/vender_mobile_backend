import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';
import { Company } from '../../companies/entities/company.entity';
import { Uom } from './uom.entity';

@Entity('uom_categories')
@Index(['name', 'companyId'], { unique: true })
export class UomCategory extends BaseEntity {
  @Column()
  name: string; // e.g. Unit, Weight, Volume, Length, Time

  @ManyToOne(() => Company, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company?: Company;

  @Column({ name: 'company_id', nullable: true })
  companyId?: string;

  @OneToMany(() => Uom, (uom) => uom.category)
  uoms: Uom[];
}
