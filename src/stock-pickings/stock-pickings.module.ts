import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { StockPicking } from "./entities/stock-picking.entity";
import { Warehouse } from "../warehouses/entities/warehouse.entity";
import { OperationType } from "../operation-types/entities/operation-type.entity";
import { StockPickingsService } from "./stock-pickings.service";
import { StockPickingsController } from "./stock-pickings.controller";
import { StockMovesModule } from "../stock-moves/stock-moves.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([StockPicking, Warehouse, OperationType]),
    StockMovesModule,
  ],
  controllers: [StockPickingsController],
  providers: [StockPickingsService],
  exports: [StockPickingsService],
})
export class StockPickingsModule {}
