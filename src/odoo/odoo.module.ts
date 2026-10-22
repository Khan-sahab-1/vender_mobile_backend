import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Partner } from "../partners/entities/partner.entity";
import { Role } from "../roles/entities/role.entity";
import { User } from "../users/entities/user.entity";
import { OdooController } from "./odoo.controller";
import { OdooService } from "./odoo.service";

@Module({
  imports: [TypeOrmModule.forFeature([Partner, User, Role])],
  controllers: [OdooController],
  providers: [OdooService],
  exports: [OdooService],
})
export class OdooModule {}

