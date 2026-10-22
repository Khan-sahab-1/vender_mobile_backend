import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from "typeorm";
import { BaseEntity } from "../../common/base.entity";
import { Product } from "../../products/entities/product.entity";
import { Location } from "../../locations/entities/location.entity";
import { Warehouse } from "../../warehouses/entities/warehouse.entity";
import { ProductCategory } from "../../product-category/entities/product-category.entity";
import { Company } from "../../companies/entities/company.entity";
import { StockMove } from "../../stock-moves/entities/stock-move.entity";

export enum InventoryAdjustmentState {
  DRAFT = "draft", // initial state
  IN_PROGRESS = "in_progress", // count in progress
  DONE = "done", // validated — corrective stock moves applied and quants updated
  CANCELLED = "cancelled",
}

export enum InventoryType {
  STOCK_INVENTORY = "stock_inventory",
  STOCK_JOURNAL = "stock_journal",
}

export enum InventoryOf {
  ALL_PRODUCTS = "all_products",
  CATEGORY = "category",
  PRODUCT = "product",
  LOT = "lot",
}

/**
 * Mirrors Odoo's stock.inventory: physical stock count session.
 * Compares theoretical quantity (from StockQuant) against physically counted stock.
 * Validating the session creates corrective StockMoves and updates StockQuant balances.
 */
@Entity("inventory_adjustments")
export class InventoryAdjustment extends BaseEntity {
  @Column({ name: "reference", nullable: true })
  reference: string;

  @Column()
  name: string;

  @Column({
    type: "varchar",
    default: InventoryType.STOCK_INVENTORY,
    name: "inventory_type",
  })
  inventoryType: InventoryType;

  @ManyToOne(() => Warehouse, { eager: true })
  @JoinColumn({ name: "warehouse_id" })
  warehouse: Warehouse;

  @Column({ name: "warehouse_id" })
  warehouseId: string;

  @ManyToOne(() => Location, { eager: true, nullable: true })
  @JoinColumn({ name: "location_id" })
  location?: Location;

  @Column({ name: "location_id", nullable: true })
  locationId?: string;

  @Column({
    type: "varchar",
    default: InventoryOf.ALL_PRODUCTS,
    name: "inventory_of",
  })
  inventoryOf: InventoryOf;

  @ManyToOne(() => ProductCategory, { eager: true, nullable: true })
  @JoinColumn({ name: "category_id" })
  category?: ProductCategory;

  @Column({ name: "category_id", nullable: true })
  categoryId?: string;

  @ManyToOne(() => Product, { eager: true, nullable: true })
  @JoinColumn({ name: "product_id" })
  product?: Product;

  @Column({ name: "product_id", nullable: true })
  productId?: string;

  @Column({ name: "lot_number", nullable: true })
  lotNumber?: string;

  @Column({ name: "inventory_date", type: "date", default: () => "CURRENT_DATE" })
  inventoryDate: string;

  @Column({
    type: "enum",
    enum: InventoryAdjustmentState,
    default: InventoryAdjustmentState.DRAFT,
  })
  state: InventoryAdjustmentState;

  @ManyToOne(() => Company, { nullable: true })
  @JoinColumn({ name: "company_id" })
  company?: Company;

  @Column({ name: "company_id", nullable: true })
  companyId?: string;

  @Column({ nullable: true })
  notes: string;

  @OneToMany(() => InventoryAdjustmentLine, (line) => line.adjustment, {
    cascade: true,
    eager: true,
  })
  lines: InventoryAdjustmentLine[];
}

@Entity("inventory_adjustment_lines")
export class InventoryAdjustmentLine extends BaseEntity {
  @ManyToOne(() => InventoryAdjustment, (adj) => adj.lines, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "adjustment_id" })
  adjustment: InventoryAdjustment;

  @Column({ name: "adjustment_id" })
  adjustmentId: string;

  @ManyToOne(() => Product, { eager: true })
  @JoinColumn({ name: "product_id" })
  product: Product;

  @Column({ name: "product_id" })
  productId: string;

  @ManyToOne(() => Location, { eager: true, nullable: true })
  @JoinColumn({ name: "location_id" })
  location: Location;

  @Column({ name: "location_id", nullable: true })
  locationId: string | null;

  /** Snapshot of stock-on-hand at the moment count was started. */
  @Column("decimal", { precision: 14, scale: 4, name: "theoretical_quantity", default: 0 })
  theoreticalQuantity: number;

  /** Filled in by the user as they physically count the stock. */
  @Column("decimal", {
    precision: 14,
    scale: 4,
    nullable: true,
    name: "counted_quantity",
  })
  countedQuantity: number;

  /** Adjustment delta (+/-) starting at 0. Positive adds to stock, negative deducts from stock. */
  @Column("decimal", {
    precision: 14,
    scale: 4,
    name: "adjustment_quantity",
    default: 0,
  })
  adjustmentQuantity: number;

  @Column({ name: "lot_number", nullable: true })
  lotNumber?: string;

  /** Reason explaining why stock is adjusted, required when difference is negative (minus). */
  @Column({ name: "reason", nullable: true })
  reason?: string;

  /** Set once the header is validated, linking to the corrective StockMove. */
  @Column({ name: "stock_move_id", nullable: true })
  stockMoveId: string;

  @ManyToOne(() => StockMove, { eager: true, nullable: true })
  @JoinColumn({ name: "stock_move_id" })
  stockMove?: StockMove;
}
