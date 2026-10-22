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
import { InventoryAdjustmentsService } from "./inventory-adjustments.service";
import { CreateInventoryAdjustmentDto } from "./dto/create-inventory-adjustment.dto";
import { UpdateInventoryAdjustmentLineDto } from "./dto/update-line.dto";
import { PaginationQueryDto } from "../common/dto/pagination-query.dto";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";

@ApiTags("Inventory Adjustments")
@ApiBearerAuth()
@Controller("inventory-adjustments")
export class InventoryAdjustmentsController {
  constructor(private readonly service: InventoryAdjustmentsService) {}

  @Post()
  @Roles("admin", "inventory_manager")
  create(
    @Body() dto: CreateInventoryAdjustmentDto,
    @CurrentUser() user: any,
  ) {
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
  @ApiQuery({
    name: "state",
    required: false,
    enum: ["draft", "in_progress", "done", "cancelled"],
  })
  @ApiQuery({
    name: "warehouseId",
    required: false,
    type: String,
  })
  @ApiQuery({
    name: "search",
    required: false,
    type: String,
  })
  findAll(
    @Query() query: PaginationQueryDto & { state?: string; search?: string; warehouseId?: string },
    @CurrentUser() user: any,
  ) {
    return this.service.findAll(query, user?.companyId);
  }

  @Get(":id")
  findOne(@Param("id") id: string, @CurrentUser() user: any) {
    return this.service.findOne(id, user?.companyId);
  }

  @Post(":id/start")
  @Roles("admin", "inventory_manager")
  start(@Param("id") id: string, @CurrentUser() user: any) {
    return this.service.start(id, user?.companyId);
  }

  @Post(":id/lines")
  @Roles("admin", "inventory_manager")
  addLine(
    @Param("id") id: string,
    @Body()
    dto: {
      productId: string;
      locationId?: string;
      countedQuantity?: number;
      adjustmentQuantity?: number;
      lotNumber?: string;
      reason?: string;
    },
    @CurrentUser() user: any,
  ) {
    return this.service.addLine(id, dto, user?.companyId);
  }

  @Patch(":id/lines/:lineId")
  @Roles("admin", "inventory_manager")
  updateLine(
    @Param("id") id: string,
    @Param("lineId") lineId: string,
    @Body() dto: UpdateInventoryAdjustmentLineDto,
    @CurrentUser() user: any,
  ) {
    return this.service.updateLine(id, lineId, dto, user?.companyId);
  }

  @Delete(":id/lines/:lineId")
  @Roles("admin", "inventory_manager")
  deleteLine(
    @Param("id") id: string,
    @Param("lineId") lineId: string,
    @CurrentUser() user: any,
  ) {
    return this.service.deleteLine(id, lineId, user?.companyId);
  }

  @Patch(":id/validate")
  @Roles("admin", "inventory_manager")
  validateAdjustment(@Param("id") id: string, @CurrentUser() user: any) {
    return this.service.validateAdjustment(id, user?.companyId);
  }

  @Patch(":id/cancel")
  @Roles("admin", "inventory_manager")
  cancel(@Param("id") id: string, @CurrentUser() user: any) {
    return this.service.cancel(id, user?.companyId);
  }
}
