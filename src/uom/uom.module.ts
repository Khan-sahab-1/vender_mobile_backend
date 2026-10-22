import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UomCategory } from './entities/uom-category.entity';
import { Uom } from './entities/uom.entity';
import { UomCategoryService } from './uom-category.service';
import { UomService } from './uom.service';
import { UomCategoryController, UomController } from './uom.controller';

@Module({
  imports: [TypeOrmModule.forFeature([UomCategory, Uom])],
  controllers: [UomCategoryController, UomController],
  providers: [UomCategoryService, UomService],
  exports: [UomCategoryService, UomService],
})
export class UomModule {}
