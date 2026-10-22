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
import { AccountGroupsService } from "./account-groups.service";
import { AccountGroupQueryDto } from "./dto/account-group-query.dto";
import { CreateAccountGroupDto } from "./dto/create-account-group.dto";
import { UpdateAccountGroupDto } from "./dto/update-account-group.dto";

@ApiTags("Account Groups")
@ApiBearerAuth()
@Controller("account-groups")
export class AccountGroupsController {
  constructor(private readonly service: AccountGroupsService) {}

  @Post()
  @Roles("admin", "accountant")
  @ApiOperation({ summary: "Create an account group" })
  create(@Body() dto: CreateAccountGroupDto, @CurrentUser() user: any) {
    return this.service.create(dto, user?.companyId);
  }

  @Post("seed-defaults")
  @Roles("admin", "accountant")
  @ApiOperation({ summary: "Seed standard Odoo account groups" })
  seedDefaults() {
    return this.service.seedDefaults();
  }

  @Get()
  @ApiOperation({ summary: "List account groups" })
  findAll(@Query() query: AccountGroupQueryDto, @CurrentUser() user: any) {
    return this.service.findAll(query, user?.companyId);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get account group details" })
  findOne(@Param("id") id: string, @CurrentUser() user: any) {
    return this.service.findOne(id, user?.companyId);
  }

  @Patch(":id")
  @Roles("admin", "accountant")
  @ApiOperation({ summary: "Update an account group" })
  update(
    @Param("id") id: string,
    @Body() dto: UpdateAccountGroupDto,
    @CurrentUser() user: any,
  ) {
    return this.service.update(id, dto, user?.companyId);
  }

  @Delete(":id")
  @Roles("admin", "accountant")
  @ApiOperation({ summary: "Deactivate an account group" })
  remove(@Param("id") id: string, @CurrentUser() user: any) {
    return this.service.remove(id, user?.companyId);
  }
}

