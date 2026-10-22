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
import { CreatePurchaseOrderDto } from "./dto/create-purchase-order.dto";
import { PurchaseOrderQueryDto } from "./dto/purchase-order-query.dto";
import { RejectPurchaseOrderDto } from "./dto/reject-purchase-order.dto";
import { UpdatePurchaseOrderDto } from "./dto/update-purchase-order.dto";
import { PurchaseOrdersService } from "./purchase-orders.service";

@ApiTags("Purchase Orders")
@ApiBearerAuth()
@Controller("purchase-orders")
export class PurchaseOrdersController {
  constructor(private readonly service: PurchaseOrdersService) {}

  @Post()
  create(@Body() dto: CreatePurchaseOrderDto, @CurrentUser() user: any) {
    return this.service.create(dto, user?.companyId);
  }

  @Get()
  findAll(@Query() query: PurchaseOrderQueryDto, @CurrentUser() user: any) {
    return this.service.findAll(query, user?.companyId);
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.service.findOne(id);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdatePurchaseOrderDto) {
    return this.service.update(id, dto);
  }

  @Patch(":id/confirm")
  confirmOrder(@Param("id") id: string) {
    return this.service.confirmOrder(id);
  }

  @Patch(":id/send-for-approval")
  sendForApproval(@Param("id") id: string) {
    return this.service.sendForApproval(id);
  }

  @Patch(":id/submit")
  submitForApproval(@Param("id") id: string) {
    return this.service.sendForApproval(id);
  }

  @Patch(":id/approve")
  @Roles("admin", "purchase_manager")
  approve(@Param("id") id: string) {
    return this.service.approve(id);
  }

  @Patch(":id/reject")
  @Roles("admin", "purchase_manager")
  reject(@Param("id") id: string, @Body() dto: RejectPurchaseOrderDto) {
    return this.service.reject(id, dto?.reason);
  }

  @Patch(":id/cancel")
  cancel(@Param("id") id: string) {
    return this.service.cancel(id);
  }

  @Post(":id/create-bill")
  @Roles("admin", "purchase_manager", "accountant")
  createBill(@Param("id") id: string) {
    return this.service.createBill(id);
  }

  @Patch(":id/receive")
  @Roles("admin", "purchase_manager", "inventory_manager")
  receiveGoods(@Param("id") id: string) {
    return this.service.receiveGoods(id);
  }
}
