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
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { AccountAccountsService } from "./account-accounts.service";
import { AccountAccountQueryDto } from "./dto/account-account-query.dto";
import { CreateAccountAccountDto } from "./dto/create-account-account.dto";
import { UpdateAccountAccountDto } from "./dto/update-account-account.dto";

@ApiTags("Chart of Accounts")
@ApiBearerAuth()
@Controller("account-accounts")
export class AccountAccountsController {
  constructor(private readonly service: AccountAccountsService) {}

  @Post()
  @Roles("admin", "accountant")
  create(@Body() dto: CreateAccountAccountDto, @CurrentUser() user: any) {
    return this.service.create(dto, user?.companyId);
  }

  @Post("clear-all")
  @Roles("admin", "accountant")
  clearAll() {
    return this.service.clearAllAccountingData();
  }

  @Get()
  findAll(@Query() query: AccountAccountQueryDto, @CurrentUser() user: any) {
    return this.service.findAll(query, user?.companyId);
  }

  @Get(":id")
  findOne(@Param("id") id: string, @CurrentUser() user: any) {
    return this.service.findOne(id, user?.companyId);
  }

  @Patch(":id")
  @Roles("admin", "accountant")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateAccountAccountDto,
    @CurrentUser() user: any,
  ) {
    return this.service.update(id, dto, user?.companyId);
  }

  @Delete(":id")
  @Roles("admin", "accountant")
  remove(@Param("id") id: string, @CurrentUser() user: any) {
    return this.service.remove(id, user?.companyId);
  }
}
