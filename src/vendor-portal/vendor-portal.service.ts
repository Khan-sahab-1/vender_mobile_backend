import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Partner } from "../partners/entities/partner.entity";
import { PurchaseOrder } from "../purchase-orders/entities/purchase-order.entity";
import { PurchaseOrderState } from "../purchase-orders/enums/purchase-order.enum";
import { VendorBill } from "../vendor-bills/entities/vendor-bill.entity";
import { UpdateVendorProfileDto } from "./dto/update-vendor-profile.dto";

@Injectable()
export class VendorPortalService {
  constructor(
    @InjectRepository(Partner)
    private readonly partnerRepo: Repository<Partner>,
    @InjectRepository(PurchaseOrder)
    private readonly poRepo: Repository<PurchaseOrder>,
    @InjectRepository(VendorBill)
    private readonly billRepo: Repository<VendorBill>,
  ) {}

  /**
   * Helper to verify and return the partner for a given partnerId
   */
  async getPartner(partnerId: string): Promise<Partner> {
    if (!partnerId) {
      throw new BadRequestException("Vendor partner ID is missing from user profile");
    }
    const partner = await this.partnerRepo.findOne({ where: { id: partnerId } });
    if (!partner) {
      throw new NotFoundException(`Partner ${partnerId} not found`);
    }
    return partner;
  }

  /**
   * Vendor Dashboard Summary Stats
   */
  async getDashboard(partnerId: string): Promise<any> {
    const partner = await this.getPartner(partnerId);

    const localOrders = await this.poRepo.find({
      where: { vendorId: partner.id },
      order: { createdAt: "DESC" },
      take: 10,
    });

    const localBills = await this.billRepo.find({
      where: { vendorId: partner.id },
      order: { createdAt: "DESC" },
      take: 10,
    });

    const totalOrdersCount = localOrders.length;
    const pendingOrdersCount = localOrders.filter(
      (o) =>
        o.state === PurchaseOrderState.DRAFT ||
        o.state === PurchaseOrderState.TO_APPROVE,
    ).length;

    const totalBillsCount = localBills.length;
    
    // Calculate total outstanding due amount
    const totalDueAmount = Number(
      localBills.reduce(
        (acc, b) => acc + (Number(b.residualAmount) || 0),
        0,
      ).toFixed(2),
    );

    // Combine recent orders
    const unifiedOrders = localOrders.slice(0, 5).map((o) => ({
      id: o.id,
      source: "local",
      poNumber: o.name,
      date: o.orderDate,
      state: o.state,
      totalAmount: Number(o.amountTotal || 0),
    }));

    return {
      vendor: {
        id: partner.id,
        odooId: partner.odooPartnerId,
        name: partner.name,
        email: partner.email,
        phone: partner.phone || partner.mobile,
        gstin: partner.gstin,
        city: partner.city,
      },
      stats: {
        totalOrders: totalOrdersCount,
        pendingOrders: pendingOrdersCount,
        totalBills: totalBillsCount,
        totalDueAmount,
      },
      recentOrders: unifiedOrders,
    };
  }

  /**
   * List all purchase orders for the vendor
   */
  async getOrders(partnerId: string): Promise<any[]> {
    const partner = await this.getPartner(partnerId);

    const localOrders = await this.poRepo.find({
      where: { vendorId: partner.id },
      order: { orderDate: "DESC" },
    });

    const formattedLocal = localOrders.map((o) => ({
      id: o.id,
      source: "local",
      name: o.name,
      dateOrder: o.orderDate,
      datePlanned: o.deliveryDate,
      state: o.state,
      amountUntaxed: Number(o.amountUntaxed || 0),
      amountTax: Number(o.amountTax || 0),
      amountTotal: Number(o.amountTotal || 0),
    }));

    return formattedLocal;
  }

  /**
   * Single purchase order detail
   */
  async getOrderDetail(partnerId: string, orderId: string): Promise<any> {
    const partner = await this.getPartner(partnerId);

    const localPO = await this.poRepo.findOne({
      where: { id: orderId, vendorId: partner.id },
      relations: ["lines", "lines.product", "lines.uom"],
    });

    if (!localPO) {
      throw new NotFoundException(`Purchase Order ${orderId} not found`);
    }

    return {
      id: localPO.id,
      source: "local",
      name: localPO.name,
      state: localPO.state,
      dateOrder: localPO.orderDate,
      datePlanned: localPO.deliveryDate,
      amountUntaxed: Number(localPO.amountUntaxed || 0),
      amountTax: Number(localPO.amountTax || 0),
      amountTotal: Number(localPO.amountTotal || 0),
      notes: localPO.notes,
      lines: (localPO.lines || []).map((l) => ({
        id: l.id,
        productName: l.product?.name || l.description || "Product Item",
        description: l.description,
        quantity: Number(l.quantity || 1),
        unitPrice: Number(l.unitPrice || 0),
        subtotal: Number(l.subtotal || 0),
        uom: l.uom?.name || "",
      })),
    };
  }

  /**
   * List all bills for the vendor
   */
  async getBills(partnerId: string): Promise<any[]> {
    const partner = await this.getPartner(partnerId);

    const localBills = await this.billRepo.find({
      where: { vendorId: partner.id },
      order: { invoiceDate: "DESC" },
    });

    const formattedLocal = localBills.map((b) => ({
      id: b.id,
      source: "local",
      billNumber: b.billNumber,
      reference: b.sourceDocument,
      date: b.invoiceDate,
      dueDate: b.dueDate,
      state: b.state,
      amountUntaxed: Number(b.amountUntaxed || 0),
      amountTax: Number(b.amountTax || 0),
      amountTotal: Number(b.amountTotal || 0),
      residualAmount: Number(b.residualAmount || 0),
    }));

    return formattedLocal;
  }

  /**
   * Single bill detail
   */
  async getBillDetail(partnerId: string, billId: string): Promise<any> {
    const partner = await this.getPartner(partnerId);

    const localBill = await this.billRepo.findOne({
      where: { id: billId, vendorId: partner.id },
      relations: ["lines", "lines.product"],
    });

    if (!localBill) {
      throw new NotFoundException(`Vendor Bill ${billId} not found`);
    }

    return {
      id: localBill.id,
      source: "local",
      billNumber: localBill.billNumber,
      reference: localBill.sourceDocument,
      state: localBill.state,
      date: localBill.invoiceDate,
      dueDate: localBill.dueDate,
      amountUntaxed: Number(localBill.amountUntaxed || 0),
      amountTax: Number(localBill.amountTax || 0),
      amountTotal: Number(localBill.amountTotal || 0),
      residualAmount: Number(localBill.residualAmount || 0),
      lines: (localBill.lines || []).map((l) => ({
        id: l.id,
        name: l.description || l.product?.name || "Product Item",
        quantity: Number(l.quantity || 1),
        unitPrice: Number(l.unitPrice || 0),
        subtotal: Number(l.subtotal || 0),
      })),
    };
  }

  /**
   * Vendor profile
   */
  async getProfile(partnerId: string): Promise<Partner> {
    return this.getPartner(partnerId);
  }

  /**
   * Update vendor profile
   */
  async updateProfile(
    partnerId: string,
    dto: UpdateVendorProfileDto,
  ): Promise<Partner> {
    const partner = await this.getPartner(partnerId);

    if (dto.phone !== undefined) partner.phone = dto.phone;
    if (dto.mobile !== undefined) partner.mobile = dto.mobile;
    if (dto.street !== undefined) partner.street = dto.street;
    if (dto.city !== undefined) partner.city = dto.city;
    if (dto.gstin !== undefined) {
      partner.gstin = dto.gstin;
      partner.hasGstin = !!dto.gstin;
    }

    return this.partnerRepo.save(partner);
  }
}
