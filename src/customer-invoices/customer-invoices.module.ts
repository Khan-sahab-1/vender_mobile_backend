import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountAccountsModule } from '../account-accounts/account-accounts.module';
import { AccountJournal } from '../account-journals/entities/account-journal.entity';
import { AccountMovesModule } from '../account-moves/account-moves.module';
import { CustomerInvoiceLine } from './entities/customer-invoice-line.entity';
import { CustomerInvoice } from './entities/customer-invoice.entity';
import { CustomerInvoicesController } from './customer-invoices.controller';
import { CustomerInvoicesService } from './customer-invoices.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CustomerInvoice,
      CustomerInvoiceLine,
      AccountJournal,
    ]),
    AccountAccountsModule,
    AccountMovesModule,
  ],
  controllers: [CustomerInvoicesController],
  providers: [CustomerInvoicesService],
  exports: [CustomerInvoicesService],
})
export class CustomerInvoicesModule {}

