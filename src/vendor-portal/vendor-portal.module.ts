import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Partner } from "../partners/entities/partner.entity";
import { PurchaseOrder } from "../purchase-orders/entities/purchase-order.entity";
import { VendorBill } from "../vendor-bills/entities/vendor-bill.entity";
import { VendorPortalController } from "./vendor-portal.controller";
import { VendorPortalService } from "./vendor-portal.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([Partner, PurchaseOrder, VendorBill]),
  ],
  controllers: [VendorPortalController],
  providers: [VendorPortalService],
  exports: [VendorPortalService],
})
export class VendorPortalModule {}
