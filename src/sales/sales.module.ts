import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';
import { SalesOrder } from './entities/sales-order.entity';
import { SalesOrderLine } from './entities/sales-order-line.entity';
import { Partner } from '../partners/entities/partner.entity';
import { Product } from '../products/entities/product.entity';
import { Tax } from '../taxes/entities/tax.entity';
import { Warehouse } from '../warehouses/entities/warehouse.entity';
import { Division } from '../divisions/entities/division.entity';
import { Location } from '../locations/entities/location.entity';
import { CustomerInvoicesModule } from '../customer-invoices/customer-invoices.module';
import { StockPickingsModule } from '../stock-pickings/stock-pickings.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SalesOrder,
      SalesOrderLine,
      Partner,
      Product,
      Tax,
      Warehouse,
      Division,
      Location,
    ]),
    CustomerInvoicesModule,
    StockPickingsModule,
  ],
  controllers: [SalesController],
  providers: [SalesService],
  exports: [SalesService],
})
export class SalesModule {}
