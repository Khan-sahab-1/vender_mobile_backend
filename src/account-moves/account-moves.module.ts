import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AccountJournalsModule } from "../account-journals/account-journals.module";
import { AccountMovesController } from "./account-moves.controller";
import { AccountMovesService } from "./account-moves.service";
import { AccountMoveLine } from "./entities/account-move-line.entity";
import { AccountMove } from "./entities/account-move.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([AccountMove, AccountMoveLine]),
    AccountJournalsModule,
  ],
  controllers: [AccountMovesController],
  providers: [AccountMovesService],
  exports: [AccountMovesService],
})
export class AccountMovesModule {}
