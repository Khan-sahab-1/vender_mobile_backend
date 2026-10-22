import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { CreateOperationTypeDto } from "./dto/create-operation-type.dto";
import { OperationTypeQueryDto } from "./dto/operation-type-query.dto";
import { UpdateOperationTypeDto } from "./dto/update-operation-type.dto";
import { OperationTypesService } from "./operation-types.service";

@ApiTags("Operation Types")
@ApiBearerAuth()
@Controller("operation-types")
export class OperationTypesController {
  constructor(private readonly service: OperationTypesService) {}

  @Post()
  @Roles("admin", "company_admin", "inventory_manager")
  create(@Body() dto: CreateOperationTypeDto, @CurrentUser() user: any) {
    return this.service.create(dto, user?.companyId);
  }

  @Get()
  findAll(
    @Query() query: OperationTypeQueryDto,
    @CurrentUser() user: any,
  ) {
    return this.service.findAll(query, user?.companyId);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.service.findOne(id);
  }

  @Patch(":id")
  @Roles("admin", "company_admin", "inventory_manager")
  update(@Param("id") id: string, @Body() dto: UpdateOperationTypeDto) {
    return this.service.update(id, dto);
  }

  @Delete(":id")
  @Roles("admin", "company_admin", "inventory_manager")
  remove(@Param("id") id: string) {
    return this.service.remove(id);
  }
}
