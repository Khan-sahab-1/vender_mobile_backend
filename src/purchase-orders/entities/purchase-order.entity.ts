import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from "typeorm";
import { BaseEntity } from "../../common/base.entity";
import { Division } from "../../divisions/entities/division.entity";
import { Partner } from "../../partners/entities/partner.entity";
import { VendorBill } from "../../vendor-bills/entities/vendor-bill.entity";
import { Warehouse } from "../../warehouses/entities/warehouse.entity";
import { StockPicking } from "../../stock-pickings/entities/stock-picking.entity";
import { Company } from "../../companies/entities/company.entity";
import {
  PurchaseOrderState,
  PurchaseOrderType,
} from "../enums/purchase-order.enum";
import { PurchaseOrderLine } from "./purchase-order-line.entity";

@Entity("purchase_orders")
export class PurchaseOrder extends BaseEntity {
  @Column({ unique: true, nullable: true })
  name: string | null;

  @ManyToOne(() => Company, { nullable: true, eager: false })
  @JoinColumn({ name: "company_id" })
  company?: Company;

  @Column({ name: "company_id", nullable: true })
  companyId?: string;

  @Column({
    type: "enum",
    enum: PurchaseOrderType,
    default: PurchaseOrderType.ADHOC,
  })
  type: PurchaseOrderType;

  @ManyToOne(() => Partner, { eager: true })
  @JoinColumn({ name: "vendor_id" })
  vendor: Partner;

  @Column({ name: "vendor_id" })
  vendorId: string;

  @ManyToOne(() => Warehouse, { eager: true })
  @JoinColumn({ name: "warehouse_id" })
  warehouse: Warehouse;

  @Column({ name: "warehouse_id" })
  warehouseId: string;

  @ManyToOne(() => Division, { eager: true })
  @JoinColumn({ name: "division_id" })
  division: Division;

  @Column({ name: "division_id" })
  divisionId: string;

  @Column({ default: "INR" })
  currency: string;

  @Column({
    type: "timestamp",
    name: "order_date",
    default: () => "CURRENT_TIMESTAMP",
  })
  orderDate: Date;

  @Column({ type: "timestamp", name: "delivery_date", nullable: true })
  deliveryDate: Date;

  @Column({
    type: "enum",
    enum: PurchaseOrderState,
    default: PurchaseOrderState.DRAFT,
  })
  state: PurchaseOrderState;

  @Column("decimal", {
    precision: 12,
    scale: 4,
    default: 0,
    name: "amount_untaxed",
  })
  amountUntaxed: number;

  @Column("decimal", {
    precision: 12,
    scale: 4,
    default: 0,
    name: "amount_tax",
  })
  amountTax: number;

  @Column("decimal", {
    precision: 12,
    scale: 4,
    default: 0,
    name: "amount_total",
  })
  amountTotal: number;

  @ManyToOne(() => VendorBill, { nullable: true, eager: true })
  @JoinColumn({ name: "vendor_bill_id" })
  vendorBill: VendorBill;

  @Column({ name: "vendor_bill_id", nullable: true })
  vendorBillId: string;

  @ManyToOne(() => StockPicking, { nullable: true, eager: true })
  @JoinColumn({ name: "stock_picking_id" })
  stockPicking: StockPicking;

  @Column({ name: "stock_picking_id", nullable: true })
  stockPickingId: string;

  @Column({ type: "text", nullable: true })
  notes: string;

  @Column({ type: "text", nullable: true, name: "rejection_reason" })
  rejectionReason: string;

  @OneToMany(() => PurchaseOrderLine, (line) => line.order, {
    cascade: true,
    eager: true,
  })
  lines: PurchaseOrderLine[];
}
