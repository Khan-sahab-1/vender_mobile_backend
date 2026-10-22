import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';
import { Product } from '../../products/entities/product.entity';
import { Uom } from '../../uom/entities/uom.entity';
import { Location } from '../../locations/entities/location.entity';
import { StockPicking } from '../../stock-pickings/entities/stock-picking.entity';

export enum StockMoveState {
  DRAFT = 'draft',
  CONFIRMED = 'confirmed',
  DONE = 'done',
  CANCELLED = 'cancelled',
}

/**
 * Mirrors Odoo's stock.move: the atomic movement of a quantity of product
 * from one location to another. Every stock operation in the system —
 * receipts, deliveries, internal transfers, returns, inventory-adjustment
 * corrections — is ultimately made of one or more of these.
 */
@Entity('stock_moves')
export class StockMove extends BaseEntity {
  @ManyToOne(() => Product, { eager: true })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'product_id' })
  productId: string;

  @ManyToOne(() => Uom, { eager: true })
  @JoinColumn({ name: 'uom_id' })
  uom: Uom;

  @Column({ name: 'uom_id' })
  uomId: string;

  @Column('decimal', { precision: 14, scale: 4 })
  quantity: number;

  @ManyToOne(() => Location, { eager: true })
  @JoinColumn({ name: 'source_location_id' })
  sourceLocation: Location;

  @Column({ name: 'source_location_id' })
  sourceLocationId: string;

  @ManyToOne(() => Location, { eager: true })
  @JoinColumn({ name: 'dest_location_id' })
  destLocation: Location;

  @Column({ name: 'dest_location_id' })
  destLocationId: string;

  @Column({ type: 'enum', enum: StockMoveState, default: StockMoveState.DRAFT })
  state: StockMoveState;

  @ManyToOne(() => StockPicking, (picking) => picking.moves, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'picking_id' })
  picking: StockPicking;

  @Column({ name: 'picking_id', nullable: true })
  pickingId: string;

  @Column({ nullable: true })
  reference: string;

  @Column({ type: 'timestamp', nullable: true, name: 'scheduled_date' })
  scheduledDate: Date;

  /** Set when the move is validated (state -> done). */
  @Column({ type: 'timestamp', nullable: true, name: 'effective_date' })
  effectiveDate: Date;

  /** Snapshot of the product's cost price at the moment this move was validated. */
  @Column('decimal', { precision: 14, scale: 4, nullable: true, name: 'unit_cost' })
  unitCost: number;
}
