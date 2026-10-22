import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AccountJournal } from "./entities/account-journal.entity";
import { AccountJournalsController } from "./account-journals.controller";
import { AccountJournalsService } from "./account-journals.service";

@Module({
  imports: [TypeOrmModule.forFeature([AccountJournal])],
  controllers: [AccountJournalsController],
  providers: [AccountJournalsService],
  exports: [AccountJournalsService, TypeOrmModule],
})
export class AccountJournalsModule {}
