import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AccountTypeEntity } from "./entities/account-type.entity";
import { AccountTypesController } from "./account-types.controller";
import { AccountTypesService } from "./account-types.service";

@Module({
  imports: [TypeOrmModule.forFeature([AccountTypeEntity])],
  controllers: [AccountTypesController],
  providers: [AccountTypesService],
  exports: [AccountTypesService, TypeOrmModule],
})
export class AccountTypesModule {}

