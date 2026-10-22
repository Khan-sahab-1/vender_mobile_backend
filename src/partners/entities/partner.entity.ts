import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';
import { PaymentTerm } from '../../payment-terms/entities/payment-term.entity';
import { Pricelist } from '../../pricelists/entities/pricelist.entity';
import { Warehouse } from '../../warehouses/entities/warehouse.entity';
import { Location } from '../../locations/entities/location.entity';
import { AccountAccount } from '../../account-accounts/entities/account-account.entity';
import { Company } from '../../companies/entities/company.entity';

export enum CompanyType {
  COMPANY = 'company',
  INDIVIDUAL = 'individual',
}

export enum CompanyStructure {
  PVT_LTD = 'pvt_ltd',
  PUBLIC_LTD = 'public_ltd',
  LLC = 'llc',
  PROPRIETORSHIP = 'proprietorship',
  PARTNERSHIP = 'partnership',
  OTHER = 'other',
}

@Entity('partners')
export class Partner extends BaseEntity {
  @Column()
  name: string;

  /** Multi-tenant: Company ownership */
  @ManyToOne(() => Company, { nullable: true, eager: false })
  @JoinColumn({ name: 'company_id' })
  company?: Company;

  @Column({ name: 'company_id', nullable: true })
  companyId?: string;

  /** Odoo res.partner ID for synchronization */
  @Column({ name: 'odoo_partner_id', nullable: true, type: 'int' })
  odooPartnerId?: number;

  /** Parent company if this partner is an individual contact */
  @ManyToOne(() => Partner, { nullable: true, eager: false, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'parent_id' })
  parent?: Partner;

  @Column({ name: 'parent_id', nullable: true })
  parentId?: string;

  /** Company or Individual */
  @Column({
    type: 'enum',
    enum: CompanyType,
    default: CompanyType.COMPANY,
    name: 'company_type',
  })
  companyType: CompanyType;

  /** Legal company structure: Pvt Ltd, Public Ltd, LLC, Proprietorship, etc. */
  @Column({
    type: 'enum',
    enum: CompanyStructure,
    nullable: true,
    name: 'company_structure',
  })
  companyStructure?: CompanyStructure;

  @Column({ default: true, name: 'is_company' })
  isCompany: boolean;

  /** Mirrors Odoo's customer_rank/supplier_rank as booleans */
  @Column({ default: false, name: 'is_customer' })
  isCustomer: boolean;

  @Column({ default: false, name: 'is_vendor' })
  isVendor: boolean;

  // Contact Information
  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  mobile: string;

  @Column({ nullable: true })
  website: string;

  // Address
  @Column({ nullable: true })
  street: string;

  @Column({ nullable: true, name: 'street2' })
  street2: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  state: string;

  @Column({ nullable: true })
  zip: string;

  @Column({ nullable: true })
  country: string;

  // Tax & Compliance (GSTIN & PAN)
  @Column({ default: false, name: 'has_gstin' })
  hasGstin: boolean;

  @Column({ nullable: true })
  gstin?: string;

  @Column({ default: false, name: 'has_pan' })
  hasPan: boolean;

  @Column({ nullable: true })
  pan?: string;

  /** Generic Tax / VAT identification number (backward compatible) */
  @Column({ nullable: true, name: 'tax_id' })
  taxId: string;

  // Warehouse & Stock Locations
  @ManyToOne(() => Warehouse, { nullable: true, eager: true })
  @JoinColumn({ name: 'warehouse_id' })
  warehouse?: Warehouse;

  @Column({ name: 'warehouse_id', nullable: true })
  warehouseId?: string;

  @ManyToOne(() => Location, { nullable: true, eager: true })
  @JoinColumn({ name: 'customer_location_id' })
  customerLocation?: Location;

  @Column({ name: 'customer_location_id', nullable: true })
  customerLocationId?: string;

  @ManyToOne(() => Location, { nullable: true, eager: true })
  @JoinColumn({ name: 'vendor_location_id' })
  vendorLocation?: Location;

  @Column({ name: 'vendor_location_id', nullable: true })
  vendorLocationId?: string;

  // Invoicing & Accounting Properties
  @ManyToOne(() => AccountAccount, { nullable: true, eager: true })
  @JoinColumn({ name: 'account_receivable_id' })
  accountReceivable?: AccountAccount;

  @Column({ name: 'account_receivable_id', nullable: true })
  accountReceivableId?: string;

  @ManyToOne(() => AccountAccount, { nullable: true, eager: true })
  @JoinColumn({ name: 'account_payable_id' })
  accountPayable?: AccountAccount;

  @Column({ name: 'account_payable_id', nullable: true })
  accountPayableId?: string;

  // Commercial / Sales Terms
  @ManyToOne(() => PaymentTerm, { nullable: true, eager: true })
  @JoinColumn({ name: 'payment_term_id' })
  paymentTerm: PaymentTerm;

  @Column({ name: 'payment_term_id', nullable: true })
  paymentTermId: string;

  @ManyToOne(() => Pricelist, { nullable: true, eager: true })
  @JoinColumn({ name: 'pricelist_id' })
  pricelist: Pricelist;

  @Column({ name: 'pricelist_id', nullable: true })
  pricelistId: string;

  @Column({ default: 'INR' })
  currency: string;

  @Column('decimal', {
    precision: 14,
    scale: 4,
    default: 0,
    name: 'credit_limit',
  })
  creditLimit: number;

  @Column({ type: 'text', nullable: true })
  notes: string;
}
