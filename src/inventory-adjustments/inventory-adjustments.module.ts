import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  InventoryAdjustment,
  InventoryAdjustmentLine,
} from "./entities/inventory-adjustment.entity";
import { Location } from "../locations/entities/location.entity";
import { Warehouse } from "../warehouses/entities/warehouse.entity";
import { Product } from "../products/entities/product.entity";
import { ProductCategory } from "../product-category/entities/product-category.entity";
import { Company } from "../companies/entities/company.entity";
import { InventoryAdjustmentsService } from "./inventory-adjustments.service";
import { InventoryAdjustmentsController } from "./inventory-adjustments.controller";
import { StockQuantsModule } from "../stock-quants/stock-quants.module";
import { StockMovesModule } from "../stock-moves/stock-moves.module";
import { StockMove } from "../stock-moves/entities/stock-move.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InventoryAdjustment,
      InventoryAdjustmentLine,
      Location,
      Warehouse,
      Product,
      ProductCategory,
      Company,
      StockMove,
    ]),
    StockQuantsModule,
    StockMovesModule,
  ],
  controllers: [InventoryAdjustmentsController],
  providers: [InventoryAdjustmentsService],
  exports: [InventoryAdjustmentsService],
})
export class InventoryAdjustmentsModule {}
