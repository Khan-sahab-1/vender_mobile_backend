import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/base.entity';
import { Product } from '../../products/entities/product.entity';
import { Location } from '../../locations/entities/location.entity';

/**
 * Mirrors Odoo's stock.quant: the current on-hand quantity of a product at a
 * specific (internal) location. Rows are created/updated automatically by
 * StockMovesService whenever a move is validated — never edited directly.
 */
@Entity('stock_quants')
@Index(['productId', 'locationId'], { unique: true })
export class StockQuant extends BaseEntity {
  @ManyToOne(() => Product, { eager: true })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'product_id' })
  productId: string;

  @ManyToOne(() => Location, { eager: true })
  @JoinColumn({ name: 'location_id' })
  location: Location;

  @Column({ name: 'location_id' })
  locationId: string;

  @Column('decimal', { precision: 14, scale: 4, default: 0 })
  quantity: number;

  /** Quantity earmarked by confirmed-but-not-yet-done outgoing moves. */
  @Column('decimal', { precision: 14, scale: 4, default: 0, name: 'reserved_quantity' })
  reservedQuantity: number;
}
