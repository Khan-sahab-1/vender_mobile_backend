import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiQuery, ApiTags } from "@nestjs/swagger";
import { StockQuantsService } from "./stock-quants.service";
import { PaginationQueryDto } from "../common/dto/pagination-query.dto";

@ApiTags("Stock Quants")
@ApiBearerAuth()
@Controller("stock-quants")
export class StockQuantsController {
  constructor(private readonly service: StockQuantsService) {}

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
  @ApiQuery({ name: "locationId", required: false })
  findAll(
    @Query()
    query: PaginationQueryDto & { productId?: string; locationId?: string },
  ) {
    return this.service.findAll(query);
  }

  @Get("on-hand")
  @ApiQuery({ name: "productId", required: true })
  @ApiQuery({ name: "locationId", required: true })
  async getOnHand(
    @Query("productId") productId: string,
    @Query("locationId") locationId: string,
  ) {
    const quantity = await this.service.getOnHand(productId, locationId);
    return { productId, locationId, quantity };
  }
}
