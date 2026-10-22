import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Paginated } from "../common/dto/pagination-query.dto";
import { Division } from "../divisions/entities/division.entity";
import { Partner } from "../partners/entities/partner.entity";
import { Product } from "../products/entities/product.entity";
import { Tax, TaxAmountType } from "../taxes/entities/tax.entity";
import { VendorBillsService } from "../vendor-bills/vendor-bills.service";
import { Warehouse } from "../warehouses/entities/warehouse.entity";
import { CreatePurchaseOrderDto } from "./dto/create-purchase-order.dto";
import { PurchaseOrderQueryDto } from "./dto/purchase-order-query.dto";
import { UpdatePurchaseOrderDto } from "./dto/update-purchase-order.dto";
import { PurchaseOrderLine } from "./entities/purchase-order-line.entity";
import { PurchaseOrder } from "./entities/purchase-order.entity";
import { Location, LocationUsage } from "../locations/entities/location.entity";
import { StockPickingsService } from "../stock-pickings/stock-pickings.service";
import { PickingType } from "../stock-pickings/enums/stock-picking.enum";
import { VendorBillState } from "../vendor-bills/enums/vendor-bill.enum";
import { Uom, UomType } from "../uom/entities/uom.entity";
import {
  PurchaseOrderState,
  PurchaseOrderType,
} from "./enums/purchase-order.enum";

@Injectable()
export class PurchaseOrdersService {
  constructor(
    @InjectRepository(PurchaseOrder)
    private readonly repo: Repository<PurchaseOrder>,
    @InjectRepository(PurchaseOrderLine)
    private readonly lineRepo: Repository<PurchaseOrderLine>,
    @InjectRepository(Partner)
    private readonly partnerRepo: Repository<Partner>,
    @InjectRepository(Warehouse)
    private readonly warehouseRepo: Repository<Warehouse>,
    @InjectRepository(Division)
    private readonly divisionRepo: Repository<Division>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(Tax)
    private readonly taxRepo: Repository<Tax>,
    @InjectRepository(Location)
    private readonly locationRepo: Repository<Location>,
    private readonly vendorBillsService: VendorBillsService,
    private readonly stockPickingsService: StockPickingsService,
  ) {}

  async generatePoName(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.repo
      .createQueryBuilder("po")
      .where("po.name LIKE :prefix", { prefix: `PO/${year}/%` })
      .getCount();
    const seq = String(count + 1).padStart(5, "0");
    return `PO/${year}/${seq}`;
  }

  async create(dto: CreatePurchaseOrderDto, companyId?: string): Promise<PurchaseOrder> {
    const [vendor, warehouse, division] = await Promise.all([
      this.partnerRepo.findOne({ where: { id: dto.vendorId } }),
      this.warehouseRepo.findOne({ where: { id: dto.warehouseId } }),
      this.divisionRepo.findOne({ where: { id: dto.divisionId } }),
    ]);

    if (!vendor) throw new BadRequestException("Vendor not found");
    if (!warehouse) throw new BadRequestException("Warehouse not found");
    if (!division) throw new BadRequestException("Division not found");

    let amountUntaxed = 0;
    let amountTax = 0;

    const lineEntities: PurchaseOrderLine[] = [];

    for (const l of dto.lines) {
      const quantity = Number(l.quantity);
      const unitPrice = Number(l.unitPrice);
      const subtotal = Number((quantity * unitPrice).toFixed(4));
      let taxAmount = 0;

      if (l.taxId) {
        const tax = await this.taxRepo.findOne({ where: { id: l.taxId } });
        if (tax) {
          if (tax.amountType === TaxAmountType.PERCENT) {
            taxAmount = Number(
              ((subtotal * Number(tax.amount)) / 100).toFixed(4),
            );
          } else {
            taxAmount = Number((quantity * Number(tax.amount)).toFixed(4));
          }
        }
      }

      amountUntaxed += subtotal;
      amountTax += taxAmount;

      let lineUomId = l.uomId;
      if (!lineUomId && l.productId) {
        const prod = await this.productRepo.findOne({ where: { id: l.productId } });
        lineUomId = prod?.uomId;
      }
      if (!lineUomId) {
        const uomRepo = this.repo.manager.getRepository(Uom);
        const defaultUom =
          (await uomRepo.findOne({ where: { uomType: UomType.REFERENCE } })) ||
          (await uomRepo.findOne({}));
        lineUomId = defaultUom?.id;
      }

      lineEntities.push(
        this.lineRepo.create({
          productId: l.productId,
          description: l.description,
          quantity,
          unitPrice,
          uomId: lineUomId,
          taxId: l.taxId,
          taxAmount,
          subtotal,
        }),
      );
    }

    const amountTotal = Number((amountUntaxed + amountTax).toFixed(4));

    const effectiveCompanyId = companyId || (dto as any).companyId;

    const po = this.repo.create({
      name: null,
      type: dto.type ?? PurchaseOrderType.ADHOC,
      vendorId: dto.vendorId,
      warehouseId: dto.warehouseId,
      divisionId: dto.divisionId,
      companyId: effectiveCompanyId || undefined,
      currency: dto.currency || "INR",
      orderDate: dto.orderDate ? new Date(dto.orderDate) : new Date(),
      deliveryDate: dto.deliveryDate ? new Date(dto.deliveryDate) : undefined,
      state: PurchaseOrderState.DRAFT,
      amountUntaxed: Number(amountUntaxed.toFixed(4)),
      amountTax: Number(amountTax.toFixed(4)),
      amountTotal,
      notes: dto.notes,
      lines: lineEntities,
    });

    const saved = await this.repo.save(po);
    return this.findOne(saved.id);
  }

  async findAll(
    query: PurchaseOrderQueryDto & { companyId?: string },
    companyId?: string,
  ): Promise<Paginated<PurchaseOrder>> {
    const {
      page,
      limit,
      search,
      state,
      type,
      vendorId,
      warehouseId,
      divisionId,
      active,
    } = query;

    const effectiveCompanyId = companyId || query?.companyId;

    const queryBuilder = this.repo
      .createQueryBuilder("po")
      .leftJoinAndSelect("po.vendor", "vendor")
      .leftJoinAndSelect("po.warehouse", "warehouse")
      .leftJoinAndSelect("po.division", "division")
      .leftJoinAndSelect("po.vendorBill", "vendorBill")
      .leftJoinAndSelect("po.stockPicking", "stockPicking")
      .leftJoinAndSelect("stockPicking.moves", "stockPickingMoves")
      .leftJoinAndSelect("po.lines", "lines")
      .leftJoinAndSelect("lines.product", "product")
      .leftJoinAndSelect("lines.tax", "tax")
      .leftJoinAndSelect("lines.uom", "uom");

    if (effectiveCompanyId) {
      queryBuilder.andWhere("po.companyId = :companyId", { companyId: effectiveCompanyId });
    }
    if (active !== undefined) {
      queryBuilder.andWhere("po.active = :active", { active });
    }
    if (state) {
      queryBuilder.andWhere("po.state = :state", { state });
    }
    if (type) {
      queryBuilder.andWhere("po.type = :type", { type });
    }
    if (vendorId) {
      queryBuilder.andWhere("po.vendorId = :vendorId", { vendorId });
    }
    if (warehouseId) {
      queryBuilder.andWhere("po.warehouseId = :warehouseId", { warehouseId });
    }
    if (divisionId) {
      queryBuilder.andWhere("po.divisionId = :divisionId", { divisionId });
    }
    if (search) {
      queryBuilder.andWhere(
        "(po.name ILIKE :search OR vendor.name ILIKE :search OR po.notes ILIKE :search)",
        { search: `%${search}%` },
      );
    }

    queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy("po.createdAt", "DESC");

    const [data, total] = await queryBuilder.getManyAndCount();
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string): Promise<PurchaseOrder> {
    const po = await this.repo.findOne({
      where: { id },
      relations: [
        "vendor",
        "warehouse",
        "division",
        "vendorBill",
        "stockPicking",
        "stockPicking.moves",
        "lines",
        "lines.product",
        "lines.tax",
        "lines.uom",
      ],
    });
    if (!po) throw new NotFoundException(`Purchase Order ${id} not found`);
    return po;
  }

  async update(
    id: string,
    dto: UpdatePurchaseOrderDto,
  ): Promise<PurchaseOrder> {
    const po = await this.findOne(id);
    if (po.state !== PurchaseOrderState.DRAFT) {
      throw new BadRequestException(
        "Only draft purchase orders can be modified",
      );
    }

    if (dto.vendorId) {
      const vendor = await this.partnerRepo.findOne({
        where: { id: dto.vendorId },
      });
      if (!vendor) throw new BadRequestException("Vendor not found");
      po.vendorId = dto.vendorId;
    }
    if (dto.warehouseId) {
      const warehouse = await this.warehouseRepo.findOne({
        where: { id: dto.warehouseId },
      });
      if (!warehouse) throw new BadRequestException("Warehouse not found");
      po.warehouseId = dto.warehouseId;
    }
    if (dto.divisionId) {
      const division = await this.divisionRepo.findOne({
        where: { id: dto.divisionId },
      });
      if (!division) throw new BadRequestException("Division not found");
      po.divisionId = dto.divisionId;
    }
    if (dto.type) po.type = dto.type;
    if (dto.currency) po.currency = dto.currency;
    if (dto.orderDate) po.orderDate = new Date(dto.orderDate);
    if (dto.deliveryDate) po.deliveryDate = new Date(dto.deliveryDate);
    if (dto.notes !== undefined) po.notes = dto.notes;


    if (dto.lines && dto.lines.length > 0) {
      await this.lineRepo.delete({ orderId: po.id });
      let amountUntaxed = 0;
      let amountTax = 0;
      const lineEntities: PurchaseOrderLine[] = [];

      for (const l of dto.lines) {
        const quantity = Number(l.quantity);
        const unitPrice = Number(l.unitPrice);
        const subtotal = Number((quantity * unitPrice).toFixed(4));
        let taxAmount = 0;

        if (l.taxId) {
          const tax = await this.taxRepo.findOne({ where: { id: l.taxId } });
          if (tax) {
            if (tax.amountType === TaxAmountType.PERCENT) {
              taxAmount = Number(
                ((subtotal * Number(tax.amount)) / 100).toFixed(4),
              );
            } else {
              taxAmount = Number((quantity * Number(tax.amount)).toFixed(4));
            }
          }
        }

        amountUntaxed += subtotal;
        amountTax += taxAmount;

        lineEntities.push(
          this.lineRepo.create({
            orderId: po.id,
            productId: l.productId,
            description: l.description,
            quantity,
            unitPrice,
            uomId: l.uomId,
            taxId: l.taxId,
            taxAmount,
            subtotal,
          }),
        );
      }

      await this.lineRepo.save(lineEntities);
      po.amountUntaxed = Number(amountUntaxed.toFixed(4));
      po.amountTax = Number(amountTax.toFixed(4));
      po.amountTotal = Number((amountUntaxed + amountTax).toFixed(4));
    }

    await this.repo.save(po);
    return this.findOne(id);
  }

  /**
   * Action 1: Confirm order
   * Generates official PO Number and keeps order in DRAFT state
   */
  async confirmOrder(id: string): Promise<PurchaseOrder> {
    const po = await this.findOne(id);
    if (po.state !== PurchaseOrderState.DRAFT) {
      throw new BadRequestException(
        `Cannot confirm order: Order is in "${po.state}" state (must be draft)`,
      );
    }

    if (!po.name || !po.name.startsWith("PO/")) {
      po.name = await this.generatePoName();
    }

    await this.repo.save(po);
    return this.findOne(id);
  }

  /**
   * Action 2: Send for approval
   * Transitions state from DRAFT -> TO_APPROVE
   */
  async sendForApproval(id: string): Promise<PurchaseOrder> {
    const po = await this.findOne(id);
    if (po.state !== PurchaseOrderState.DRAFT) {
      throw new BadRequestException(
        `Cannot send for approval: Order is in "${po.state}" state (must be draft)`,
      );
    }

    if (!po.name || !po.name.startsWith("PO/")) {
      po.name = await this.generatePoName();
    }

    po.state = PurchaseOrderState.TO_APPROVE;
    await this.repo.save(po);
    return this.findOne(id);
  }

  /**
   * Action 2: Admin approves the order
   * In Odoo standard & integrated flow:
   * 1. Creates Vendor Bill (direct billing / draft account.move)
   * 2. Creates Stock Picking (Incoming Receipt) and Stock Moves (Vendor -> WH/Stock)
   * Transitions state: TO_APPROVE -> BILLED (with vendorBill & stockPicking linked)
   */
  async approve(id: string): Promise<PurchaseOrder> {
    const po = await this.findOne(id);
    if (
      po.state !== PurchaseOrderState.TO_APPROVE &&
      po.state !== PurchaseOrderState.DRAFT
    ) {
      throw new BadRequestException(
        `Cannot approve order in "${po.state}" state (must be to_approve or draft)`,
      );
    }

    if (
      !po.name ||
      po.name.startsWith("RFQ/") ||
      po.name.startsWith("Draft") ||
      !po.name.startsWith("PO/")
    ) {
      po.name = await this.generatePoName();
    }

    // 1. Direct Flow: Generate Vendor Bill from PO pulling all vendor, address, division, currency, and lines
    const vendorBill =
      await this.vendorBillsService.createFromPurchaseOrder(po);
    po.vendorBillId = vendorBill.id;

    // 2. Inventory Flow: Generate Stock Picking (Incoming Receipt) & Stock Moves
    try {
      let vendorLocation = await this.locationRepo.findOne({
        where: { usage: LocationUsage.VENDOR },
      });
      if (!vendorLocation) {
        vendorLocation = await this.locationRepo.findOne({
          where: { name: "Vendors" },
        });
      }
      if (!vendorLocation) {
        vendorLocation = await this.locationRepo.save(
          this.locationRepo.create({
            name: "Vendors",
            completeName: "Partner Locations / Vendors",
            usage: LocationUsage.VENDOR,
          }),
        );
      }

      let destLocation = await this.locationRepo.findOne({
        where: {
          warehouseId: po.warehouseId,
          usage: LocationUsage.INTERNAL,
        },
      });
      if (!destLocation) {
        const wh =
          po.warehouse ||
          (po.warehouseId
            ? await this.warehouseRepo.findOne({
                where: { id: po.warehouseId },
              })
            : null);
        destLocation = await this.locationRepo.save(
          this.locationRepo.create({
            name: `${wh?.code || "WH"} Stock`,
            completeName: `${wh?.code || "WH"} / Stock`,
            usage: LocationUsage.INTERNAL,
            warehouseId: po.warehouseId,
          }),
        );
      }

      const uomRepo = this.repo.manager.getRepository(Uom);
      const defaultUom =
        (await uomRepo.findOne({
          where: { uomType: UomType.REFERENCE },
        })) || (await uomRepo.findOne({}));

      const validLines = (po.lines || []).filter((l) => l.productId);
      if (validLines.length > 0) {
        const picking = await this.stockPickingsService.create({
          pickingType: PickingType.RECEIPT,
          warehouseId: po.warehouseId,
          partnerId: po.vendorId,
          sourceLocationId: vendorLocation.id,
          destLocationId: destLocation.id,
          origin: po.name,
          scheduledDate: po.deliveryDate
            ? po.deliveryDate.toISOString()
            : po.orderDate.toISOString(),
          moves: validLines.map((l) => ({
            productId: l.productId,
            quantity: Number(l.quantity),
            uomId: l.uomId || l.product?.uomId || defaultUom?.id,
          })),
        });

        // Automatically confirm picking (moves state from DRAFT -> CONFIRMED)
        const confirmedPicking = await this.stockPickingsService.confirm(
          picking.id,
        );
        po.stockPickingId = confirmedPicking.id;
      }
    } catch (err) {
      console.error("Warning: Failed to create stock picking for PO", err);
    }

    // 3. Update PO state to APPROVED and link the created Vendor Bill & Picking
    po.state = PurchaseOrderState.APPROVED;
    await this.repo.save(po);

    return this.findOne(id);
  }

  /**
   * Action: Receive goods (Validate linked Stock Picking)
   * Business Rule: Stock Receipt CANNOT be validated before the Vendor Bill (Invoice) is validated!
   * This marks stock.picking -> DONE, stock.move -> DONE,
   * updates warehouse stock_quants, and records stock valuation layer.
   */
  async receiveGoods(id: string): Promise<PurchaseOrder> {
    const po = await this.findOne(id);

    // Business Rule: Invoice must be validated before receiving physical stock
    if (!po.vendorBillId || !po.vendorBill) {
      throw new BadRequestException(
        "Cannot receive goods: No Vendor Bill found for this purchase order. Please validate the invoice first.",
      );
    }

    if (po.vendorBill.state === VendorBillState.DRAFT) {
      throw new BadRequestException(
        `Cannot receive goods into stock: The Vendor Bill (${po.vendorBill.billNumber}) is still in Draft state. You must validate the invoice (action_invoice_open) before receiving goods into warehouse stock.`,
      );
    }

    // If stock picking was missing (auto-heal)
    if (!po.stockPickingId) {
      let vendorLocation = await this.locationRepo.findOne({
        where: { usage: LocationUsage.VENDOR },
      });
      if (!vendorLocation) {
        vendorLocation = await this.locationRepo.findOne({
          where: { name: "Vendors" },
        });
      }
      if (!vendorLocation) {
        vendorLocation = await this.locationRepo.save(
          this.locationRepo.create({
            name: "Vendors",
            completeName: "Partner Locations / Vendors",
            usage: LocationUsage.VENDOR,
          }),
        );
      }

      let destLocation = await this.locationRepo.findOne({
        where: {
          warehouseId: po.warehouseId,
          usage: LocationUsage.INTERNAL,
        },
      });
      if (!destLocation) {
        const wh =
          po.warehouse ||
          (po.warehouseId
            ? await this.warehouseRepo.findOne({
                where: { id: po.warehouseId },
              })
            : null);
        destLocation = await this.locationRepo.save(
          this.locationRepo.create({
            name: `${wh?.code || "WH"} Stock`,
            completeName: `${wh?.code || "WH"} / Stock`,
            usage: LocationUsage.INTERNAL,
            warehouseId: po.warehouseId,
          }),
        );
      }

      const uomRepo = this.repo.manager.getRepository(Uom);
      const defaultUom =
        (await uomRepo.findOne({
          where: { uomType: UomType.REFERENCE },
        })) || (await uomRepo.findOne({}));

      const validLines = (po.lines || []).filter((l) => l.productId);
      if (validLines.length > 0) {
        const picking = await this.stockPickingsService.create({
          pickingType: PickingType.RECEIPT,
          warehouseId: po.warehouseId,
          partnerId: po.vendorId,
          sourceLocationId: vendorLocation.id,
          destLocationId: destLocation.id,
          origin: po.name,
          scheduledDate: po.deliveryDate
            ? po.deliveryDate.toISOString()
            : po.orderDate.toISOString(),
          moves: validLines.map((l) => ({
            productId: l.productId,
            quantity: Number(l.quantity),
            uomId: l.uomId || l.product?.uomId || defaultUom?.id,
          })),
        });
        const confirmedPicking = await this.stockPickingsService.confirm(
          picking.id,
        );
        po.stockPickingId = confirmedPicking.id;
        await this.repo.save(po);
      }
    }

    if (!po.stockPickingId) {
      throw new BadRequestException(
        "No stock receipt could be created or found for this purchase order",
      );
    }

    await this.stockPickingsService.validatePicking(po.stockPickingId);
    return this.findOne(id);
  }

  /**
   * Action 3: Admin rejects the order
   */
  async reject(id: string, reason?: string): Promise<PurchaseOrder> {
    const po = await this.findOne(id);
    if (po.state !== PurchaseOrderState.TO_APPROVE) {
      throw new BadRequestException(
        `Only orders awaiting approval can be rejected`,
      );
    }
    po.state = PurchaseOrderState.REJECTED;
    if (reason) po.rejectionReason = reason;
    await this.repo.save(po);
    return this.findOne(id);
  }

  /**
   * Action 4: Cancel the order
   */
  async cancel(id: string): Promise<PurchaseOrder> {
    const po = await this.findOne(id);
    if (po.state === PurchaseOrderState.CANCELLED) {
      throw new BadRequestException("Order is already cancelled");
    }
    po.state = PurchaseOrderState.CANCELLED;
    await this.repo.save(po);
    return this.findOne(id);
  }

  /**
   * Action 5: Manual trigger to create Vendor Bill if ever needed
   */
  async createBill(id: string): Promise<PurchaseOrder> {
    const po = await this.findOne(id);
    if (po.vendorBillId) {
      throw new BadRequestException(
        "Vendor bill already generated for this purchase order",
      );
    }
    if (
      po.state !== PurchaseOrderState.APPROVED &&
      po.state !== PurchaseOrderState.TO_APPROVE
    ) {
      throw new BadRequestException(
        "Only approved purchase orders can be billed",
      );
    }

    const vendorBill =
      await this.vendorBillsService.createFromPurchaseOrder(po);
    po.vendorBillId = vendorBill.id;
    po.state = PurchaseOrderState.APPROVED;
    await this.repo.save(po);
    return this.findOne(id);
  }
}
