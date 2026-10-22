import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Partner } from './entities/partner.entity';
import { AccountAccount } from '../account-accounts/entities/account-account.entity';
import { Location } from '../locations/entities/location.entity';
import { PartnersService } from './partners.service';
import {
  PartnersController,
  CustomersController,
  VendorsController,
} from './partners.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Partner, AccountAccount, Location])],
  controllers: [PartnersController, CustomersController, VendorsController],
  providers: [PartnersService],
  exports: [PartnersService],
})
export class PartnersModule {}
