import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from "typeorm";
import { BaseEntity } from "../../common/base.entity";
import { Warehouse } from "../../warehouses/entities/warehouse.entity";
import { Location } from "../../locations/entities/location.entity";
import { Partner } from "../../partners/entities/partner.entity";
import { StockMove } from "../../stock-moves/entities/stock-move.entity";
import { OperationType } from "../../operation-types/entities/operation-type.entity";
export { PickingType, PickingState } from "../enums/stock-picking.enum";
import { PickingType, PickingState } from "../enums/stock-picking.enum";

/**
 * Mirrors Odoo's stock.picking: a transfer document (Receipt, Delivery,
 * Internal Transfer, or Return) that groups one or more stock.move lines
 * and is confirmed/validated/cancelled as a single unit.
 */
@Entity("stock_pickings")
export class StockPicking extends BaseEntity {
  /** Auto-generated human reference, e.g. "WH1/OUT/00001". */
  @Column({ unique: true })
  name: string;

  @Column({ type: "enum", enum: PickingType, name: "picking_type" })
  pickingType: PickingType;

  @ManyToOne(() => OperationType, { nullable: true, eager: true })
  @JoinColumn({ name: "operation_type_id" })
  operationType: OperationType;

  @Column({ name: "operation_type_id", nullable: true })
  operationTypeId: string;

  @ManyToOne(() => Warehouse, { nullable: true, eager: true })
  @JoinColumn({ name: "warehouse_id" })
  warehouse: Warehouse;

  @Column({ name: "warehouse_id", nullable: true })
  warehouseId: string;

  @ManyToOne(() => Location, { eager: true })
  @JoinColumn({ name: "source_location_id" })
  sourceLocation: Location;

  @Column({ name: "source_location_id" })
  sourceLocationId: string;

  @ManyToOne(() => Location, { eager: true })
  @JoinColumn({ name: "dest_location_id" })
  destLocation: Location;

  @Column({ name: "dest_location_id" })
  destLocationId: string;

  /** Vendor (for receipts) or Customer (for deliveries). */
  @ManyToOne(() => Partner, { nullable: true, eager: true })
  @JoinColumn({ name: "partner_id" })
  partner: Partner;

  @Column({ name: "partner_id", nullable: true })
  partnerId: string;

  @Column({ type: "timestamp", nullable: true, name: "scheduled_date" })
  scheduledDate: Date;

  @Column({ type: "timestamp", nullable: true, name: "effective_date" })
  effectiveDate: Date;

  @Column({ type: "enum", enum: PickingState, default: PickingState.DRAFT })
  state: PickingState;

  /** Free-text source reference, e.g. a future sales/purchase order number. */
  @Column({ nullable: true })
  origin: string;

  /** For RETURN pickings: the picking being reversed. */
  @ManyToOne(() => StockPicking, { nullable: true })
  @JoinColumn({ name: "origin_picking_id" })
  originPicking: StockPicking;

  @Column({ name: "origin_picking_id", nullable: true })
  originPickingId: string;

  @OneToMany(() => StockMove, (move) => move.picking, {
    eager: true,
  })
  moves: StockMove[];
}
