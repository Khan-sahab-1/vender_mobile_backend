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
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { AccountTypesService } from "./account-types.service";
import { AccountTypeQueryDto } from "./dto/account-type-query.dto";
import { CreateAccountTypeDto } from "./dto/create-account-type.dto";
import { UpdateAccountTypeDto } from "./dto/update-account-type.dto";

@ApiTags("Account Types")
@ApiBearerAuth()
@Controller("account-types")
export class AccountTypesController {
  constructor(private readonly service: AccountTypesService) {}

  @Post()
  @Roles("admin", "accountant")
  @ApiOperation({ summary: "Create an account type" })
  create(@Body() dto: CreateAccountTypeDto, @CurrentUser() user: any) {
    return this.service.create(dto, user?.companyId);
  }

  @Post("seed-defaults")
  @Roles("admin", "accountant")
  @ApiOperation({ summary: "Seed standard Odoo account types" })
  seedDefaults() {
    return this.service.seedDefaults();
  }

  @Get()
  @ApiOperation({ summary: "List account types" })
  findAll(@Query() query: AccountTypeQueryDto, @CurrentUser() user: any) {
    return this.service.findAll(query, user?.companyId);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get account type details" })
  findOne(@Param("id") id: string, @CurrentUser() user: any) {
    return this.service.findOne(id, user?.companyId);
  }

  @Patch(":id")
  @Roles("admin", "accountant")
  @ApiOperation({ summary: "Update an account type" })
  update(
    @Param("id") id: string,
    @Body() dto: UpdateAccountTypeDto,
    @CurrentUser() user: any,
  ) {
    return this.service.update(id, dto, user?.companyId);
  }

  @Delete(":id")
  @Roles("admin", "accountant")
  @ApiOperation({ summary: "Deactivate an account type" })
  remove(@Param("id") id: string, @CurrentUser() user: any) {
    return this.service.remove(id, user?.companyId);
  }
}

