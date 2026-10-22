import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompaniesService } from './companies.service';
import { CompaniesController } from './companies.controller';
import { Company } from './entities/company.entity';
import { Warehouse } from '../warehouses/entities/warehouse.entity';
import { Location } from '../locations/entities/location.entity';
import { ProductCategory } from '../product-category/entities/product-category.entity';
import { UomCategory } from '../uom/entities/uom-category.entity';
import { Uom } from '../uom/entities/uom.entity';
import { AccountTypeEntity } from '../account-types/entities/account-type.entity';
import { AccountGroup } from '../account-groups/entities/account-group.entity';
import { AccountAccount } from '../account-accounts/entities/account-account.entity';
import { OperationTypesModule } from '../operation-types/operation-types.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Company,
      Warehouse,
      Location,
      ProductCategory,
      UomCategory,
      Uom,
      AccountTypeEntity,
      AccountGroup,
      AccountAccount,
    ]),
    OperationTypesModule,
  ],
  controllers: [CompaniesController],
  providers: [CompaniesService],
  exports: [CompaniesService],
})
export class CompaniesModule {}
