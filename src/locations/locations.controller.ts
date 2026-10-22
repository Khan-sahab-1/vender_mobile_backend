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
import { ApiBearerAuth, ApiQuery, ApiTags } from "@nestjs/swagger";
import { LocationsService } from "./locations.service";
import { CreateLocationDto } from "./dto/create-location.dto";
import { UpdateLocationDto } from "./dto/update-location.dto";
import { PaginationQueryDto } from "../common/dto/pagination-query.dto";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";

@ApiTags("Locations")
@ApiBearerAuth()
@Controller("locations")
export class LocationsController {
  constructor(private readonly service: LocationsService) {}

  @Post()
  @Roles("admin", "inventory_manager")
  create(@Body() dto: CreateLocationDto, @CurrentUser() user: any) {
    return this.service.create(dto, user?.companyId);
  }

  @Get()
  @ApiQuery({
    name: "page",
    required: false,
    schema: { type: "integer", default: 1, minimum: 1 },
  })
  @ApiQuery({
    name: "limit",
    required: false,
    schema: { type: "integer", default: 20, minimum: 1 },
  })
  @ApiQuery({ name: "warehouseId", required: false })
  @ApiQuery({ name: "usage", required: false })
  findAll(
    @Query()
    query: PaginationQueryDto & { warehouseId?: string; usage?: string; companyId?: string },
    @CurrentUser() user: any,
  ) {
    return this.service.findAll(query, user?.companyId);
  }

  @Get(":id")
  findOne(@Param("id") id: string, @CurrentUser() user: any) {
    return this.service.findOne(id, user?.companyId);
  }

  @Patch(":id")
  @Roles("admin", "inventory_manager")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateLocationDto,
    @CurrentUser() user: any,
  ) {
    return this.service.update(id, dto, user?.companyId);
  }

  @Delete(":id")
  @Roles("admin", "inventory_manager")
  remove(@Param("id") id: string, @CurrentUser() user: any) {
    return this.service.remove(id, user?.companyId);
  }
}
