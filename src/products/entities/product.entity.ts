import {
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
} from 'typeorm';
import { BaseEntity } from '../../common/base.entity';
import { ProductCategory } from '../../product-category/entities/product-category.entity';
import { Uom } from '../../uom/entities/uom.entity';
import { Tax } from '../../taxes/entities/tax.entity';
import { Company } from '../../companies/entities/company.entity';

export enum ProductType {
  GOODS = 'goods', // storable product
  CONSUMABLE = 'consumable', // non-tracked goods
  SERVICE = 'service',
}

export enum ProductTracking {
  NONE = 'none',
  LOT = 'lot',
  SERIAL = 'serial',
}

@Entity('products')
export class Product extends BaseEntity {
  @Column()
  name: string;

  /** Virtual / Computed on-hand stock across internal locations */
  onHandQuantity?: number;

  /** Multi-tenant: Company ownership */
  @ManyToOne(() => Company, { nullable: true, eager: false })
  @JoinColumn({ name: 'company_id' })
  company?: Company;

  @Column({ name: 'company_id', nullable: true })
  companyId?: string;

  /** Internal reference / SKU */
  @Column({ nullable: true, name: 'sku' })
  sku: string;

  @Column({ nullable: true })
  barcode: string;

  @Column({ type: 'enum', enum: ProductType, default: ProductType.GOODS })
  type: ProductType;

  /** Traceability / Tracking: none | lot | serial */
  @Column({ type: 'varchar', default: 'none', nullable: true })
  tracking: string;

  /** Lot / Serial Number */
  @Column({ nullable: true, name: 'lot_number' })
  lotNumber?: string;

  @ManyToOne(() => ProductCategory, { eager: true, nullable: true })
  @JoinColumn({ name: 'category_id' })
  category: ProductCategory;

  @Column({ name: 'category_id', nullable: true })
  categoryId: string;

  /** Unit of measure used for sales/stock */
  @ManyToOne(() => Uom, { eager: true })
  @JoinColumn({ name: 'uom_id' })
  uom: Uom;

  @Column({ name: 'uom_id' })
  uomId: string;

  /** Purchase unit of measure */
  @ManyToOne(() => Uom, { nullable: true })
  @JoinColumn({ name: 'uom_po_id' })
  purchaseUom: Uom;

  @Column({ name: 'uom_po_id', nullable: true })
  purchaseUomId: string;

  @Column('decimal', { precision: 14, scale: 4, default: 0, name: 'sales_price' })
  salesPrice: number;

  @Column('decimal', { precision: 14, scale: 4, default: 0, name: 'cost_price' })
  costPrice: number;

  @ManyToMany(() => Tax)
  @JoinTable({
    name: 'product_sale_taxes',
    joinColumn: { name: 'product_id' },
    inverseJoinColumn: { name: 'tax_id' },
  })
  salesTaxes: Tax[];

  @ManyToMany(() => Tax)
  @JoinTable({
    name: 'product_purchase_taxes',
    joinColumn: { name: 'product_id' },
    inverseJoinColumn: { name: 'tax_id' },
  })
  purchaseTaxes: Tax[];

  @Column({ default: true, name: 'can_be_sold' })
  canBeSold: boolean;

  @Column({ default: true, name: 'can_be_purchased' })
  canBePurchased: boolean;

  @Column('decimal', { precision: 10, scale: 3, default: 0, nullable: true })
  weight: number;

  @Column('decimal', { precision: 10, scale: 3, default: 0, nullable: true })
  volume: number;

  @Column({ type: 'text', nullable: true })
  description: string;
}
