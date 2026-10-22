import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Pricelist, PricelistItem } from './entities/pricelist.entity';
import { Product } from '../products/entities/product.entity';
import { PricelistsService } from './pricelists.service';
import { PricelistsController } from './pricelists.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Pricelist, PricelistItem, Product])],
  controllers: [PricelistsController],
  providers: [PricelistsService],
  exports: [PricelistsService],
})
export class PricelistsModule {}
