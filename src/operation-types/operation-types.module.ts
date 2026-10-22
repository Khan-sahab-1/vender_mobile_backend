import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Location } from "../locations/entities/location.entity";
import { Warehouse } from "../warehouses/entities/warehouse.entity";
import { OperationTypesController } from "./operation-types.controller";
import { OperationTypesService } from "./operation-types.service";
import { OperationType } from "./entities/operation-type.entity";

@Module({
  imports: [TypeOrmModule.forFeature([OperationType, Warehouse, Location])],
  controllers: [OperationTypesController],
  providers: [OperationTypesService],
  exports: [OperationTypesService],
})
export class OperationTypesModule {}
