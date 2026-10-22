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
import { PaginationQueryDto } from "../common/dto/pagination-query.dto";
import { DivisionsService } from "./divisions.service";
import { CreateDivisionDto } from "./dto/create-division.dto";
import { UpdateDivisionDto } from "./dto/update-division.dto";

@ApiTags("Divisions")
@ApiBearerAuth()
@Controller("divisions")
export class DivisionsController {
  constructor(private readonly service: DivisionsService) {}

  @Post()
  @Roles("admin")
  create(@Body() dto: CreateDivisionDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.service.findAll(query);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.service.findOne(id);
  }

  @Patch(":id")
  @Roles("admin")
  update(@Param("id") id: string, @Body() dto: UpdateDivisionDto) {
    return this.service.update(id, dto);
  }

  @Delete(":id")
  @Roles("admin")
  remove(@Param("id") id: string) {
    return this.service.remove(id);
  }
}

