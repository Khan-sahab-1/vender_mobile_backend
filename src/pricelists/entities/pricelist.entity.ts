import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '../../common/base.entity';
import { Product } from '../../products/entities/product.entity';
import { ProductCategory } from '../../product-category/entities/product-category.entity';

export enum PricelistAppliedOn {
  ALL_PRODUCTS = 'all_products',
  CATEGORY = 'category',
  PRODUCT = 'product',
}

export enum PricelistComputeType {
  FIXED = 'fixed',
  PERCENTAGE = 'percentage', // discount/markup % off the product's sales price
  FORMULA = 'formula', // price = cost * (1 + markup%) rounded, simplified
}

@Entity('pricelists')
export class Pricelist extends BaseEntity {
  @Column()
  name: string; // e.g. "Public Pricelist", "Wholesale", "EU customers"

  @Column({ default: 'USD' })
  currency: string;

  @OneToMany(() => PricelistItem, (item) => item.pricelist, {
    cascade: true,
    eager: true,
  })
  items: PricelistItem[];
}

@Entity('pricelist_items')
export class PricelistItem extends BaseEntity {
  @ManyToOne(() => Pricelist, (pl) => pl.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pricelist_id' })
  pricelist: Pricelist;

  @Column({ name: 'pricelist_id' })
  pricelistId: string;

  @Column({
    type: 'enum',
    enum: PricelistAppliedOn,
    default: PricelistAppliedOn.ALL_PRODUCTS,
  })
  appliedOn: PricelistAppliedOn;

  @ManyToOne(() => Product, { nullable: true })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'product_id', nullable: true })
  productId: string;

  @ManyToOne(() => ProductCategory, { nullable: true })
  @JoinColumn({ name: 'category_id' })
  category: ProductCategory;

  @Column({ name: 'category_id', nullable: true })
  categoryId: string;

  @Column({
    type: 'enum',
    enum: PricelistComputeType,
    default: PricelistComputeType.FIXED,
  })
  computeType: PricelistComputeType;

  @Column('decimal', { precision: 14, scale: 4, nullable: true, name: 'fixed_price' })
  fixedPrice: number;

  /** For PERCENTAGE: positive = markup, negative = discount, applied to sales_price */
  @Column('decimal', { precision: 6, scale: 2, nullable: true })
  percentage: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0, name: 'min_quantity' })
  minQuantity: number;

  @Column({ type: 'date', nullable: true, name: 'date_start' })
  dateStart: string;

  @Column({ type: 'date', nullable: true, name: 'date_end' })
  dateEnd: string;

  @Column({ default: 10 })
  sequence: number;
}
