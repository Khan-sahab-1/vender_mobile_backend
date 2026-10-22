import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../common/base.entity";
import { Location } from "../../locations/entities/location.entity";
import { Warehouse } from "../../warehouses/entities/warehouse.entity";
import { PickingType } from "../../stock-pickings/enums/stock-picking.enum";

@Entity("operation_types")
export class OperationType extends BaseEntity {
  @Column()
  name: string;

  @Column({ type: "enum", enum: PickingType, name: "picking_type" })
  pickingType: PickingType;

  @ManyToOne(() => Warehouse, { eager: true })
  @JoinColumn({ name: "warehouse_id" })
  warehouse: Warehouse;

  @Column({ name: "warehouse_id" })
  warehouseId: string;

  @ManyToOne(() => Location, { eager: true })
  @JoinColumn({ name: "default_source_location_id" })
  defaultSourceLocation: Location;

  @Column({ name: "default_source_location_id" })
  defaultSourceLocationId: string;

  @ManyToOne(() => Location, { eager: true })
  @JoinColumn({ name: "default_dest_location_id" })
  defaultDestLocation: Location;

  @Column({ name: "default_dest_location_id" })
  defaultDestLocationId: string;

  @Column({ name: "sequence_prefix" })
  sequencePrefix: string;

  @Column({ name: "company_id", nullable: true })
  companyId?: string;
}
