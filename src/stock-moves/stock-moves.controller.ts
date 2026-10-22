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
import { StockMovesService } from "./stock-moves.service";
import { CreateStockMoveDto } from "./dto/create-stock-move.dto";
import { PaginationQueryDto } from "../common/dto/pagination-query.dto";
import { Roles } from "../common/decorators/roles.decorator";

@ApiTags("Stock Moves")
@ApiBearerAuth()
@Controller("stock-moves")
export class StockMovesController {
  constructor(private readonly service: StockMovesService) {}

  @Post()
  @Roles("admin", "inventory_manager")
  create(@Body() dto: CreateStockMoveDto) {
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
  @ApiQuery({ name: "productId", required: false })
  @ApiQuery({
    name: "state",
    required: false,
    enum: ["draft", "confirmed", "done", "cancelled"],
  })
  @ApiQuery({ name: "pickingId", required: false })
  findAll(
    @Query()
    query: PaginationQueryDto & {
      productId?: string;
      state?: string;
      pickingId?: string;
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
  validateMove(@Param("id") id: string) {
    return this.service.validateMove(id);
  }

  @Patch(":id/cancel")
  @Roles("admin", "inventory_manager")
  cancel(@Param("id") id: string) {
    return this.service.cancel(id);
  }
}
