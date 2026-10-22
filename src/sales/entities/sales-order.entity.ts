import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';
import { Company } from '../../companies/entities/company.entity';
import { Division } from '../../divisions/entities/division.entity';
import { Partner } from '../../partners/entities/partner.entity';
import { PaymentTerm } from '../../payment-terms/entities/payment-term.entity';
import { Pricelist } from '../../pricelists/entities/pricelist.entity';
import { Warehouse } from '../../warehouses/entities/warehouse.entity';
import { SalesOrderState, SalesOrderType } from '../enums/sales-order.enum';
import { SalesOrderLine } from './sales-order-line.entity';
import { CustomerInvoice } from '../../customer-invoices/entities/customer-invoice.entity';
import { StockPicking } from '../../stock-pickings/entities/stock-picking.entity';

@Entity('sales_orders')
export class SalesOrder extends BaseEntity {
  @Column({ unique: true, nullable: true })
  name: string | null;

  @ManyToOne(() => Company, { nullable: true, eager: false })
  @JoinColumn({ name: 'company_id' })
  company?: Company;

  @Column({ name: 'company_id', nullable: true })
  companyId?: string;

  @Column({
    type: 'enum',
    enum: SalesOrderType,
    default: SalesOrderType.ADHOC,
  })
  type: SalesOrderType;

  @ManyToOne(() => Partner, { eager: true })
  @JoinColumn({ name: 'customer_id' })
  customer: Partner;

  @Column({ name: 'customer_id' })
  customerId: string;

  @Column({ type: 'text', nullable: true, name: 'delivery_address' })
  deliveryAddress: string;

  @Column({ nullable: true, name: 'po_ref_no' })
  poRefNo: string;

  @Column({ type: 'timestamp', nullable: true, name: 'client_po_date' })
  clientPoDate: Date;

  @Column({
    type: 'timestamp',
    name: 'order_date',
    default: () => 'CURRENT_TIMESTAMP',
  })
  orderDate: Date;

  @Column({ type: 'int', nullable: true, default: 0, name: 'delivery_days' })
  deliveryDays: number;

  @Column({ type: 'timestamp', nullable: true, name: 'delivery_date' })
  deliveryDate: Date;

  @ManyToOne(() => Warehouse, { eager: true })
  @JoinColumn({ name: 'warehouse_id' })
  warehouse: Warehouse;

  @Column({ name: 'warehouse_id' })
  warehouseId: string;

  @ManyToOne(() => Division, { eager: true })
  @JoinColumn({ name: 'division_id' })
  division: Division;

  @Column({ name: 'division_id' })
  divisionId: string;

  @ManyToOne(() => Pricelist, { nullable: true, eager: true })
  @JoinColumn({ name: 'pricelist_id' })
  pricelist?: Pricelist;

  @Column({ name: 'pricelist_id', nullable: true })
  pricelistId?: string;

  @ManyToOne(() => PaymentTerm, { nullable: true, eager: true })
  @JoinColumn({ name: 'payment_term_id' })
  paymentTerm?: PaymentTerm;

  @Column({ name: 'payment_term_id', nullable: true })
  paymentTermId?: string;

  @ManyToOne(() => Partner, { nullable: true, eager: true })
  @JoinColumn({ name: 'transporter_id' })
  transporter?: Partner;

  @Column({ name: 'transporter_id', nullable: true })
  transporterId?: string;

  @Column({ nullable: true, name: 'transporter_name' })
  transporterName?: string;

  @Column({ default: 'INR' })
  currency: string;

  @Column({
    type: 'enum',
    enum: SalesOrderState,
    default: SalesOrderState.DRAFT,
  })
  state: SalesOrderState;

  @Column('decimal', {
    precision: 14,
    scale: 4,
    default: 0,
    name: 'amount_untaxed',
  })
  amountUntaxed: number;

  @Column('decimal', {
    precision: 14,
    scale: 4,
    default: 0,
    name: 'amount_discount',
  })
  amountDiscount: number;

  @Column('decimal', {
    precision: 14,
    scale: 4,
    default: 0,
    name: 'amount_tax',
  })
  amountTax: number;

  @Column('decimal', {
    precision: 14,
    scale: 4,
    default: 0,
    name: 'amount_total',
  })
  amountTotal: number;

  @Column({ type: 'text', nullable: true })
  note?: string;

  @ManyToOne(() => CustomerInvoice, { nullable: true, eager: true })
  @JoinColumn({ name: 'customer_invoice_id' })
  customerInvoice?: CustomerInvoice;

  @Column({ name: 'customer_invoice_id', nullable: true })
  customerInvoiceId?: string;

  @ManyToOne(() => StockPicking, { nullable: true, eager: true })
  @JoinColumn({ name: 'stock_picking_id' })
  stockPicking?: StockPicking;

  @Column({ name: 'stock_picking_id', nullable: true })
  stockPickingId?: string;

  @OneToMany(() => SalesOrderLine, (line) => line.order, {
    cascade: true,
    eager: true,
  })
  lines: SalesOrderLine[];
}

