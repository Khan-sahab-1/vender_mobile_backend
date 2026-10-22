import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AccountAccount } from "./entities/account-account.entity";
import { AccountAccountsController } from "./account-accounts.controller";
import { AccountAccountsService } from "./account-accounts.service";
import { AccountTypeEntity } from "../account-types/entities/account-type.entity";
import { AccountGroup } from "../account-groups/entities/account-group.entity";
import { AccountTypesModule } from "../account-types/account-types.module";
import { AccountGroupsModule } from "../account-groups/account-groups.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([AccountAccount, AccountTypeEntity, AccountGroup]),
    AccountTypesModule,
    AccountGroupsModule,
  ],
  controllers: [AccountAccountsController],
  providers: [AccountAccountsService],
  exports: [AccountAccountsService, TypeOrmModule],
})
export class AccountAccountsModule {}

