import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';
import { Product } from '../../products/entities/product.entity';

/**
 * Mirrors Odoo's stock.valuation.layer: an immutable ledger entry recording
 * how a stock move changed the accounting value of inventory. Only moves
 * that cross the internal/external boundary (receipts, deliveries, returns,
 * inventory-adjustment corrections) create a layer — pure internal transfers
 * don't change total valuation, so they don't get one.
 */
@Entity('stock_valuation_layers')
export class StockValuationLayer extends BaseEntity {
  @ManyToOne(() => Product, { eager: true })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'product_id' })
  productId: string;

  /** Signed: positive for incoming value, negative for outgoing. */
  @Column('decimal', { precision: 14, scale: 4 })
  quantity: number;

  @Column('decimal', { precision: 14, scale: 4, name: 'unit_cost' })
  unitCost: number;

  /** quantity * unitCost, stored for fast reporting. */
  @Column('decimal', { precision: 14, scale: 4 })
  value: number;

  @Column({ name: 'stock_move_id', nullable: true })
  stockMoveId: string;

  @Column({ nullable: true })
  description: string;
}
