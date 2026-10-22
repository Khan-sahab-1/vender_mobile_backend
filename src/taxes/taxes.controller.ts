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
import { TaxesService } from "./taxes.service";
import { CreateTaxDto } from "./dto/create-tax.dto";
import { UpdateTaxDto } from "./dto/update-tax.dto";
import { PaginationQueryDto } from "../common/dto/pagination-query.dto";
import { Roles } from "../common/decorators/roles.decorator";

@ApiTags("Taxes")
@ApiBearerAuth()
@Controller("taxes")
export class TaxesController {
  constructor(private readonly service: TaxesService) {}

  @Post()
  @Roles("admin", "accountant")
  create(@Body() dto: CreateTaxDto) {
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
    name: "typeTaxUse",
    required: false,
    enum: ["sale", "purchase", "none"],
  })
  findAll(@Query() query: PaginationQueryDto & { typeTaxUse?: string }) {
    return this.service.findAll(query);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.service.findOne(id);
  }

  @Patch(":id")
  @Roles("admin", "accountant")
  update(@Param("id") id: string, @Body() dto: UpdateTaxDto) {
    return this.service.update(id, dto);
  }

  @Delete(":id")
  @Roles("admin", "accountant")
  remove(@Param("id") id: string) {
    return this.service.remove(id);
  }
}
