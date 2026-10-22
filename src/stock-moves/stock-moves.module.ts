import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StockMove } from './entities/stock-move.entity';
import { Product } from '../products/entities/product.entity';
import { Location } from '../locations/entities/location.entity';
import { StockMovesService } from './stock-moves.service';
import { StockMovesController } from './stock-moves.controller';
import { StockQuantsModule } from '../stock-quants/stock-quants.module';
import { StockValuationModule } from '../stock-valuation/stock-valuation.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([StockMove, Product, Location]),
    StockQuantsModule,
    StockValuationModule,
  ],
  controllers: [StockMovesController],
  providers: [StockMovesService],
  exports: [StockMovesService],
})
export class StockMovesModule {}
