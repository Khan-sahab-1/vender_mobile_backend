import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';
import { Product } from '../../products/entities/product.entity';
import { Tax } from '../../taxes/entities/tax.entity';
import { Uom } from '../../uom/entities/uom.entity';
import { CustomerInvoice } from './customer-invoice.entity';

@Entity('customer_invoice_lines')
export class CustomerInvoiceLine extends BaseEntity {
  @ManyToOne(() => CustomerInvoice, (inv) => inv.lines, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invoice_id' })
  invoice: CustomerInvoice;

  @Column({ name: 'invoice_id' })
  invoiceId: string;

  @ManyToOne(() => Product, { nullable: true, eager: true })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'product_id', nullable: true })
  productId: string;

  @Column({ nullable: true })
  description: string;

  @Column('decimal', { precision: 14, scale: 4, default: 1 })
  quantity: number;

  @Column('decimal', { precision: 14, scale: 4, default: 0, name: 'unit_price' })
  unitPrice: number;

  @Column('decimal', { precision: 14, scale: 4, default: 0 })
  discount: number;

  @ManyToOne(() => Uom, { nullable: true, eager: true })
  @JoinColumn({ name: 'uom_id' })
  uom: Uom;

  @Column({ name: 'uom_id', nullable: true })
  uomId: string;

  @ManyToOne(() => Tax, { nullable: true, eager: true })
  @JoinColumn({ name: 'tax_id' })
  tax: Tax;

  @Column({ name: 'tax_id', nullable: true })
  taxId: string;

  @Column('decimal', { precision: 14, scale: 4, default: 0, name: 'tax_amount' })
  taxAmount: number;

  @Column('decimal', { precision: 14, scale: 4, default: 0 })
  subtotal: number;
}

