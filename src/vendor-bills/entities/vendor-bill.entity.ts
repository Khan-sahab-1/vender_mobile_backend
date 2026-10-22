import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from "typeorm";
import { AccountJournal } from "../../account-journals/entities/account-journal.entity";
import { AccountMove } from "../../account-moves/entities/account-move.entity";
import { BaseEntity } from "../../common/base.entity";
import { Division } from "../../divisions/entities/division.entity";
import { Partner } from "../../partners/entities/partner.entity";
import { Warehouse } from "../../warehouses/entities/warehouse.entity";
import { Company } from "../../companies/entities/company.entity";
import { VendorBillState } from "../enums/vendor-bill.enum";
import { VendorBillLine } from "./vendor-bill-line.entity";

@Entity("vendor_bills")
export class VendorBill extends BaseEntity {
  @Column({ unique: true, name: "bill_number", nullable: true })
  billNumber?: string;

  @ManyToOne(() => Company, { nullable: true, eager: false })
  @JoinColumn({ name: "company_id" })
  company?: Company;

  @Column({ name: "company_id", nullable: true })
  companyId?: string;

  @ManyToOne(() => AccountJournal, { nullable: true, eager: true })
  @JoinColumn({ name: "journal_id" })
  journal: AccountJournal;

  @Column({ name: "journal_id", nullable: true })
  journalId: string;

  @ManyToOne(() => Partner, { eager: true })
  @JoinColumn({ name: "vendor_id" })
  vendor: Partner;

  @Column({ name: "vendor_id" })
  vendorId: string;

  @Column({ name: "vendor_name", nullable: true })
  vendorName: string;

  @Column({ type: "text", name: "vendor_address", nullable: true })
  vendorAddress: string;

  @ManyToOne(() => Warehouse, { nullable: true, eager: true })
  @JoinColumn({ name: "warehouse_id" })
  warehouse: Warehouse;

  @Column({ name: "warehouse_id", nullable: true })
  warehouseId: string;

  @ManyToOne(() => Division, { nullable: true, eager: true })
  @JoinColumn({ name: "division_id" })
  division: Division;

  @Column({ name: "division_id", nullable: true })
  divisionId: string;

  @Column({ name: "invoice_number", nullable: true })
  invoiceNumber?: string;

  @Column({ name: "deliver_to", nullable: true })
  deliverTo?: string;

  @Column({ type: "text", name: "delivery_address", nullable: true })
  deliveryAddress?: string;

  @Column({
    type: "timestamp",
    name: "receipt_date",
    nullable: true,
  })
  receiptDate?: Date;

  @Column({ default: "INR" })
  currency: string;

  @Column({
    type: "timestamp",
    name: "invoice_date",
    default: () => "CURRENT_TIMESTAMP",
  })
  invoiceDate: Date;

  @Column({ type: "timestamp", name: "due_date", nullable: true })
  dueDate: Date;

  @Column({ name: "source_document", nullable: true })
  sourceDocument: string;

  @Column({ name: "purchase_order_id", nullable: true })
  purchaseOrderId: string;

  @ManyToOne(() => AccountMove, { nullable: true, eager: true })
  @JoinColumn({ name: "account_move_id" })
  accountMove: AccountMove;

  @Column({ name: "account_move_id", nullable: true })
  accountMoveId: string;

  @Column({
    type: "enum",
    enum: VendorBillState,
    default: VendorBillState.DRAFT,
  })
  state: VendorBillState;

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

  @Column("decimal", {
    precision: 12,
    scale: 4,
    default: 0,
    name: "residual_amount",
  })
  residualAmount: number;

  @Column({ type: "text", nullable: true })
  notes: string;

  @OneToMany(() => VendorBillLine, (line) => line.bill, {
    eager: true,
  })
  lines: VendorBillLine[];
}
