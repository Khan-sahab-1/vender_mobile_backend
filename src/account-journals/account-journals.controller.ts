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
import { AccountJournalsService } from "./account-journals.service";
import { AccountJournalQueryDto } from "./dto/account-journal-query.dto";
import { CreateAccountJournalDto } from "./dto/create-account-journal.dto";
import { UpdateAccountJournalDto } from "./dto/update-account-journal.dto";

@ApiTags("Account Journals")
@ApiBearerAuth()
@Controller("account-journals")
export class AccountJournalsController {
  constructor(private readonly service: AccountJournalsService) {}

  @Post()
  @Roles("admin", "accountant")
  @ApiOperation({ summary: "Create a new accounting journal" })
  create(@Body() dto: CreateAccountJournalDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: "List accounting journals (BILL, INV, BNK, CSH, etc.)" })
  findAll(@Query() query: AccountJournalQueryDto) {
    return this.service.findAll(query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get journal details by ID" })
  findOne(@Param("id") id: string) {
    return this.service.findOne(id);
  }

  @Patch(":id")
  @Roles("admin", "accountant")
  @ApiOperation({ summary: "Update an accounting journal" })
  update(@Param("id") id: string, @Body() dto: UpdateAccountJournalDto) {
    return this.service.update(id, dto);
  }

  @Delete(":id")
  @Roles("admin", "accountant")
  @ApiOperation({ summary: "Deactivate an accounting journal" })
  remove(@Param("id") id: string) {
    return this.service.remove(id);
  }
}
