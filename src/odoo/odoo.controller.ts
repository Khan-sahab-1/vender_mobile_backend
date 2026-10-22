import { Controller, Get, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Public } from "../common/decorators/public.decorator";
import { OdooService } from "./odoo.service";

@ApiTags("Odoo Integration")
@Controller("odoo")
export class OdooController {
  constructor(private readonly odooService: OdooService) {}

  @Public()
  @Get("status")
  getStatus() {
    return this.odooService.getStatus();
  }

  @Public()
  @Post("sync-vendors")
  syncVendors() {
    return this.odooService.syncVendors();
  }
}
