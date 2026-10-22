import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { UpdateVendorProfileDto } from "./dto/update-vendor-profile.dto";
import { VendorPortalService } from "./vendor-portal.service";

@ApiTags("Vendor Portal")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("vendor-portal")
export class VendorPortalController {
  constructor(private readonly service: VendorPortalService) {}

  @Get("dashboard")
  getDashboard(@Req() req: any) {
    return this.service.getDashboard(req.user.partnerId);
  }

  @Get("orders")
  getOrders(@Req() req: any) {
    return this.service.getOrders(req.user.partnerId);
  }

  @Get("orders/:id")
  getOrderDetail(@Req() req: any, @Param("id") id: string) {
    return this.service.getOrderDetail(req.user.partnerId, id);
  }

  @Get("bills")
  getBills(@Req() req: any) {
    return this.service.getBills(req.user.partnerId);
  }

  @Get("bills/:id")
  getBillDetail(@Req() req: any, @Param("id") id: string) {
    return this.service.getBillDetail(req.user.partnerId, id);
  }

  @Get("profile")
  getProfile(@Req() req: any) {
    return this.service.getProfile(req.user.partnerId);
  }

  @Patch("profile")
  updateProfile(@Req() req: any, @Body() dto: UpdateVendorProfileDto) {
    return this.service.updateProfile(req.user.partnerId, dto);
  }
}

