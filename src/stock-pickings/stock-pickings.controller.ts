import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiQuery, ApiTags } from "@nestjs/swagger";
import { StockPickingsService } from "./stock-pickings.service";
import { CreateStockPickingDto } from "./dto/create-stock-picking.dto";
import { PaginationQueryDto } from "../common/dto/pagination-query.dto";
import { Roles } from "../common/decorators/roles.decorator";

@ApiTags("Stock Pickings")
@ApiBearerAuth()
@Controller("stock-pickings")
export class StockPickingsController {
  constructor(private readonly service: StockPickingsService) {}

  @Post()
  @Roles("admin", "inventory_manager")
  create(@Body() dto: CreateStockPickingDto) {
    return this.service.create(dto);
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
  @ApiQuery({
    name: "pickingType",
    required: false,
    enum: ["receipt", "delivery", "internal", "return"],
  })
  @ApiQuery({
    name: "state",
    required: false,
    enum: ["draft", "confirmed", "done", "cancelled"],
  })
  @ApiQuery({ name: "warehouseId", required: false })
  @ApiQuery({ name: "operationTypeId", required: false })
  findAll(
    @Query()
    query: PaginationQueryDto & {
      pickingType?: string;
      state?: string;
      warehouseId?: string;
      operationTypeId?: string;
    },
  ) {
    return this.service.findAll(query);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.service.findOne(id);
  }

  @Patch(":id/confirm")
  @Roles("admin", "inventory_manager")
  confirm(@Param("id") id: string) {
    return this.service.confirm(id);
  }

  @Patch(":id/validate")
  @Roles("admin", "inventory_manager")
  validatePicking(@Param("id") id: string) {
    return this.service.validatePicking(id);
  }

  @Patch(":id/cancel")
  @Roles("admin", "inventory_manager")
  cancel(@Param("id") id: string) {
    return this.service.cancel(id);
  }

  @Post(":id/return")
  @Roles("admin", "inventory_manager")
  createReturn(@Param("id") id: string) {
    return this.service.createReturn(id);
  }
}
