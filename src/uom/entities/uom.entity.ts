import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';
import { Company } from '../../companies/entities/company.entity';
import { UomCategory } from './uom-category.entity';

export enum UomType {
  REFERENCE = 'reference', // the base unit of its category (factor = 1)
  BIGGER = 'bigger', // bigger than reference
  SMALLER = 'smaller', // smaller than reference
}

@Entity('uoms')
export class Uom extends BaseEntity {
  @Column()
  name: string; // e.g. Unit(s), kg, g, L, mL, Dozen

  @Column({ nullable: true })
  code: string; // e.g. "kg", "pcs"

  @ManyToOne(() => Company, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company?: Company;

  @Column({ name: 'company_id', nullable: true })
  companyId?: string;

  @ManyToOne(() => UomCategory, (category) => category.uoms, { eager: true })
  @JoinColumn({ name: 'category_id' })
  category: UomCategory;

  @Column({ name: 'category_id' })
  categoryId: string;

  @Column({ type: 'enum', enum: UomType, default: UomType.REFERENCE })
  uomType: UomType;

  /**
   * Ratio relative to the category's reference unit.
   * e.g. category "Weight" reference = kg (factor 1);
   *      g has factor 0.001 (bigger factor -> smaller unit) — mirrors Odoo's factor field.
   */
  @Column('decimal', { precision: 12, scale: 6, default: 1 })
  factor: number;

  @Column('decimal', { precision: 12, scale: 6, default: 0.01 })
  rounding: number;
}
