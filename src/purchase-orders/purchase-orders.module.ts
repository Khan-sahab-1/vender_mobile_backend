import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Division } from "../divisions/entities/division.entity";
import { Partner } from "../partners/entities/partner.entity";
import { Product } from "../products/entities/product.entity";
import { Tax } from "../taxes/entities/tax.entity";
import { Location } from "../locations/entities/location.entity";
import { StockPickingsModule } from "../stock-pickings/stock-pickings.module";
import { VendorBillsModule } from "../vendor-bills/vendor-bills.module";
import { Warehouse } from "../warehouses/entities/warehouse.entity";
import { PurchaseOrderLine } from "./entities/purchase-order-line.entity";
import { PurchaseOrder } from "./entities/purchase-order.entity";
import { PurchaseOrdersController } from "./purchase-orders.controller";
import { PurchaseOrdersService } from "./purchase-orders.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PurchaseOrder,
      PurchaseOrderLine,
      Partner,
      Warehouse,
      Division,
      Product,
      Tax,
      Location,
    ]),
    VendorBillsModule,
    StockPickingsModule,
  ],
  controllers: [PurchaseOrdersController],
  providers: [PurchaseOrdersService],
  exports: [PurchaseOrdersService],
})
export class PurchaseOrdersModule {}
