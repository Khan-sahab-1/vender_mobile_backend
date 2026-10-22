import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AccountAccountsModule } from "../account-accounts/account-accounts.module";
import { AccountJournal } from "../account-journals/entities/account-journal.entity";
import { AccountMovesModule } from "../account-moves/account-moves.module";
import { AccountMoveLine } from "../account-moves/entities/account-move-line.entity";
import { Partner } from "../partners/entities/partner.entity";
import { VendorBillLine } from "./entities/vendor-bill-line.entity";
import { VendorBill } from "./entities/vendor-bill.entity";
import { VendorBillsController } from "./vendor-bills.controller";
import { VendorBillsService } from "./vendor-bills.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      VendorBill,
      VendorBillLine,
      AccountJournal,
      AccountMoveLine,
      Partner,
    ]),
    AccountAccountsModule,
    AccountMovesModule,
  ],
  controllers: [VendorBillsController],
  providers: [VendorBillsService],
  exports: [VendorBillsService],
})
export class VendorBillsModule {}
