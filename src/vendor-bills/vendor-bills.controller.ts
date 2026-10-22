import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Roles } from "../common/decorators/roles.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { RegisterPaymentDto } from "./dto/register-payment.dto";
import { UpdateVendorBillDto } from "./dto/update-vendor-bill.dto";
import { VendorBillQueryDto } from "./dto/vendor-bill-query.dto";
import { VendorBillsService } from "./vendor-bills.service";

@ApiTags("Vendor Bills (account.invoice)")
@ApiBearerAuth()
@Controller("vendor-bills")
export class VendorBillsController {
  constructor(private readonly service: VendorBillsService) {}

  @Get()
  findAll(@Query() query: VendorBillQueryDto, @CurrentUser() user: any) {
    return this.service.findAll(query, user?.companyId);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.service.findOne(id);
  }

  @Patch(":id")
  @Roles("admin", "accountant")
  update(@Param("id") id: string, @Body() dto: UpdateVendorBillDto) {
    return this.service.update(id, dto);
  }

  @Patch(":id/validate")
  @Roles("admin", "accountant")
  validateBill(@Param("id") id: string) {
    return this.service.validateBill(id);
  }

  @Post(":id/register-payment")
  @Roles("admin", "accountant")
  registerPayment(
    @Param("id") id: string,
    @Body() dto: RegisterPaymentDto,
  ) {
    return this.service.registerPayment(id, dto);
  }

  @Patch(":id/cancel")
  @Roles("admin", "accountant")
  cancelBill(@Param("id") id: string) {
    return this.service.cancelBill(id);
  }
}
