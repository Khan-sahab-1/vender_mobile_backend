import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiQuery, ApiTags } from "@nestjs/swagger";
import { StockValuationService } from "./stock-valuation.service";
import { PaginationQueryDto } from "../common/dto/pagination-query.dto";

@ApiTags("Stock Valuation")
@ApiBearerAuth()
@Controller("stock-valuation")
export class StockValuationController {
  constructor(private readonly service: StockValuationService) {}

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
  findAll(@Query() query: PaginationQueryDto & { productId?: string }) {
    return this.service.findAll(query);
  }

  @Get("summary")
  getSummary() {
    return this.service.getSummary();
  }

  @Get("summary/:productId")
  getSummaryForProduct(@Param("productId") productId: string) {
    return this.service.getSummaryForProduct(productId);
  }
}
