import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StockValuationLayer } from './entities/stock-valuation-layer.entity';
import { StockValuationService } from './stock-valuation.service';
import { StockValuationController } from './stock-valuation.controller';

@Module({
  imports: [TypeOrmModule.forFeature([StockValuationLayer])],
  controllers: [StockValuationController],
  providers: [StockValuationService],
  exports: [StockValuationService],
})
export class StockValuationModule {}
