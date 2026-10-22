import {
  Controller,
  Get,
  Param,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AccountMovesService } from "./account-moves.service";
import { AccountMoveQueryDto } from "./dto/account-move-query.dto";

@ApiTags("Journal Entries (account.move)")
@ApiBearerAuth()
@Controller("account-moves")
export class AccountMovesController {
  constructor(private readonly service: AccountMovesService) {}

  @Get()
  @ApiOperation({ summary: "List journal entries with filters (state, journalId, moveType, partnerId, date range)" })
  findAll(@Query() query: AccountMoveQueryDto) {
    return this.service.findAll(query);
  }

  @Get("partner-ledger/:partnerId")
  @ApiOperation({
    summary: "Get General Ledger for a specific Partner (Vendor/Customer)",
    description: "Returns all debit/credit journal items for the partner, showing individual entries and net balance.",
  })
  getPartnerLedger(@Param("partnerId") partnerId: string) {
    return this.service.getPartnerLedger(partnerId);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get journal entry details by ID including balanced debit/credit lines" })
  findOne(@Param("id") id: string) {
    return this.service.findOne(id);
  }
}

