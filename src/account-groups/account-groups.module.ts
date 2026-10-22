import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AccountGroup } from "./entities/account-group.entity";
import { AccountTypeEntity } from "../account-types/entities/account-type.entity";
import { AccountGroupsController } from "./account-groups.controller";
import { AccountGroupsService } from "./account-groups.service";

@Module({
  imports: [TypeOrmModule.forFeature([AccountGroup, AccountTypeEntity])],
  controllers: [AccountGroupsController],
  providers: [AccountGroupsService],
  exports: [AccountGroupsService, TypeOrmModule],
})
export class AccountGroupsModule {}

