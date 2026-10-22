import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BankAccount } from "./entities/bank-account.entity";
import { BankAccountsController } from "./bank-accounts.controller";
import { BankAccountsService } from "./bank-accounts.service";
import { AccountJournal } from "../account-journals/entities/account-journal.entity";

@Module({
  imports: [TypeOrmModule.forFeature([BankAccount, AccountJournal])],
  controllers: [BankAccountsController],
  providers: [BankAccountsService],
  exports: [BankAccountsService, TypeOrmModule],
})
export class BankAccountsModule {}
