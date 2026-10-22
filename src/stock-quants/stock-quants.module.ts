import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StockQuant } from './entities/stock-quant.entity';
import { StockQuantsService } from './stock-quants.service';
import { StockQuantsController } from './stock-quants.controller';

@Module({
  imports: [TypeOrmModule.forFeature([StockQuant])],
  controllers: [StockQuantsController],
  providers: [StockQuantsService],
  exports: [StockQuantsService],
})
export class StockQuantsModule {}
