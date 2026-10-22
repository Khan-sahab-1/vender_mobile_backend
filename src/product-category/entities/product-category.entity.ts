import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';

@Entity('product_categories')
export class ProductCategory extends BaseEntity {
  @Column()
  name: string;

  @ManyToOne(() => ProductCategory, (cat) => cat.children, { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent: ProductCategory;

  @Column({ name: 'parent_id', nullable: true })
  parentId: string;

  @OneToMany(() => ProductCategory, (cat) => cat.parent)
  children: ProductCategory[];

  /** Materialized full path, e.g. "All / Electronics / Phones" — mirrors Odoo's complete_name */
  @Column({ name: 'complete_name', nullable: true })
  completeName: string;

  @Column({ name: 'company_id', nullable: true })
  companyId?: string;
}
