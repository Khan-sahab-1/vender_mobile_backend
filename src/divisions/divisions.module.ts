import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Division } from "./entities/division.entity";
import { DivisionsController } from "./divisions.controller";
import { DivisionsService } from "./divisions.service";

@Module({
  imports: [TypeOrmModule.forFeature([Division])],
  controllers: [DivisionsController],
  providers: [DivisionsService],
  exports: [DivisionsService],
})
export class DivisionsModule {}

