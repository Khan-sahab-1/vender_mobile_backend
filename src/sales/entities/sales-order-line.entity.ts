import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';
import { Product } from '../../products/entities/product.entity';
import { Tax } from '../../taxes/entities/tax.entity';
import { SalesOrder } from './sales-order.entity';

@Entity('sales_order_lines')
export class SalesOrderLine extends BaseEntity {
  @ManyToOne(() => SalesOrder, (order) => order.lines, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'order_id' })
  order: SalesOrder;

  @Column({ name: 'order_id' })
  orderId: string;

  @ManyToOne(() => Product, { nullable: true, eager: true })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'product_id', nullable: true })
  productId: string;

  @Column({ nullable: true })
  description: string;

  @Column('decimal', { precision: 12, scale: 4, default: 1 })
  quantity: number;

  @Column('decimal', {
    precision: 12,
    scale: 4,
    default: 0,
    name: 'unit_price',
  })
  unitPrice: number;

  @Column('decimal', {
    precision: 6,
    scale: 2,
    default: 0,
  })
  discount: number; // percentage (e.g. 5 for 5%)

  @Column('decimal', {
    precision: 12,
    scale: 4,
    default: 0,
    name: 'discount_amount',
  })
  discountAmount: number;

  @ManyToOne(() => Tax, { nullable: true, eager: true })
  @JoinColumn({ name: 'tax_id' })
  tax: Tax;

  @Column({ name: 'tax_id', nullable: true })
  taxId: string;

  @Column('decimal', {
    precision: 12,
    scale: 4,
    default: 0,
    name: 'tax_amount',
  })
  taxAmount: number;

  @Column('decimal', { precision: 12, scale: 4, default: 0 })
  subtotal: number; // (quantity * unitPrice) - discountAmount

  @Column('decimal', { precision: 12, scale: 4, default: 0 })
  total: number; // subtotal + taxAmount
}

