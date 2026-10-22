import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';
import { Company } from '../../companies/entities/company.entity';
import { Warehouse } from '../../warehouses/entities/warehouse.entity';

export enum LocationUsage {
  VIEW = 'view', // organizational, not a real physical spot
  INTERNAL = 'internal', // stock storage location inside a warehouse
  CUSTOMER = 'customer', // virtual location representing customers
  VENDOR = 'vendor', // virtual location representing vendors/suppliers
  INVENTORY = 'inventory', // virtual location used for inventory adjustments
  TRANSIT = 'transit', // virtual location for goods in transit
  PRODUCTION = 'production', // virtual location for manufacturing consumption/output
}

@Entity('locations')
export class Location extends BaseEntity {
  @Column()
  name: string;

  @Column({ name: 'complete_name', nullable: true })
  completeName: string;

  @ManyToOne(() => Company, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company?: Company;

  @Column({ name: 'company_id', nullable: true })
  companyId?: string;

  @ManyToOne(() => Location, (loc) => loc.children, { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent: Location;

  @Column({ name: 'parent_id', nullable: true })
  parentId: string;

  @OneToMany(() => Location, (loc) => loc.parent)
  children: Location[];

  @ManyToOne(() => Warehouse, { nullable: true, eager: true })
  @JoinColumn({ name: 'warehouse_id' })
  warehouse: Warehouse;

  @Column({ name: 'warehouse_id', nullable: true })
  warehouseId: string;

  @Column({ type: 'enum', enum: LocationUsage, default: LocationUsage.INTERNAL })
  usage: LocationUsage;

  @Column({ nullable: true })
  barcode: string;
}
