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
import { BankAccountsService } from "./bank-accounts.service";
import { BankAccountQueryDto } from "./dto/bank-account-query.dto";
import { CreateBankAccountDto } from "./dto/create-bank-account.dto";
import { UpdateBankAccountDto } from "./dto/update-bank-account.dto";

@ApiTags("Bank Accounts")
@ApiBearerAuth()
@Controller("bank-accounts")
export class BankAccountsController {
  constructor(private readonly service: BankAccountsService) {}

  @Post()
  @Roles("admin", "accountant")
  create(@Body() dto: CreateBankAccountDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll(@Query() query: BankAccountQueryDto) {
    return this.service.findAll(query);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.service.findOne(id);
  }

  @Patch(":id")
  @Roles("admin", "accountant")
  update(@Param("id") id: string, @Body() dto: UpdateBankAccountDto) {
    return this.service.update(id, dto);
  }

  @Delete(":id")
  @Roles("admin", "accountant")
  remove(@Param("id") id: string) {
    return this.service.remove(id);
  }
}
