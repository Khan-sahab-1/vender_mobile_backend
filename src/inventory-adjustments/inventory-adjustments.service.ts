import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  InventoryAdjustment,
  InventoryAdjustmentLine,
  InventoryAdjustmentState,
  InventoryOf,
  InventoryType,
} from "./entities/inventory-adjustment.entity";
import { Location, LocationUsage } from "../locations/entities/location.entity";
import { Warehouse } from "../warehouses/entities/warehouse.entity";
import { Product } from "../products/entities/product.entity";
import { ProductCategory } from "../product-category/entities/product-category.entity";
import { CreateInventoryAdjustmentDto } from "./dto/create-inventory-adjustment.dto";
import { UpdateInventoryAdjustmentLineDto } from "./dto/update-line.dto";
import { StockQuantsService } from "../stock-quants/stock-quants.service";
import { StockMovesService } from "../stock-moves/stock-moves.service";
import {
  Paginated,
  PaginationQueryDto,
} from "../common/dto/pagination-query.dto";

const ADJUSTMENT_LOCATION_NAME = "Inventory Adjustment";

@Injectable()
export class InventoryAdjustmentsService implements OnModuleInit {
  constructor(
    @InjectRepository(InventoryAdjustment)
    private readonly repo: Repository<InventoryAdjustment>,
    @InjectRepository(InventoryAdjustmentLine)
    private readonly lineRepo: Repository<InventoryAdjustmentLine>,
    @InjectRepository(Location)
    private readonly locationRepo: Repository<Location>,
    @InjectRepository(Warehouse)
    private readonly warehouseRepo: Repository<Warehouse>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(ProductCategory)
    private readonly categoryRepo: Repository<ProductCategory>,
    private readonly quantsService: StockQuantsService,
    private readonly movesService: StockMovesService,
  ) {}

  async onModuleInit() {
    try {
      await this.repo.query(`
        ALTER TYPE "inventory_adjustments_state_enum" ADD VALUE IF NOT EXISTS 'in_progress' BEFORE 'done';
      `).catch(() => {});
      await this.repo.query(`
        ALTER TABLE "inventory_adjustments" ADD COLUMN IF NOT EXISTS "reference" varchar;
        ALTER TABLE "inventory_adjustments" ADD COLUMN IF NOT EXISTS "inventory_type" varchar DEFAULT 'stock_inventory';
        ALTER TABLE "inventory_adjustments" ADD COLUMN IF NOT EXISTS "inventory_of" varchar DEFAULT 'all_products';
        ALTER TABLE "inventory_adjustments" ADD COLUMN IF NOT EXISTS "location_id" uuid;
        ALTER TABLE "inventory_adjustments" ADD COLUMN IF NOT EXISTS "category_id" uuid;
        ALTER TABLE "inventory_adjustments" ADD COLUMN IF NOT EXISTS "product_id" uuid;
        ALTER TABLE "inventory_adjustments" ADD COLUMN IF NOT EXISTS "lot_number" varchar;
        ALTER TABLE "inventory_adjustments" ADD COLUMN IF NOT EXISTS "inventory_date" date DEFAULT CURRENT_DATE;
        ALTER TABLE "inventory_adjustments" ADD COLUMN IF NOT EXISTS "company_id" uuid;
        ALTER TABLE "inventory_adjustment_lines" ADD COLUMN IF NOT EXISTS "lot_number" varchar;
        ALTER TABLE "inventory_adjustment_lines" ADD COLUMN IF NOT EXISTS "reason" varchar;
        ALTER TABLE "inventory_adjustment_lines" ADD COLUMN IF NOT EXISTS "adjustment_quantity" numeric DEFAULT 0;
      `).catch(() => {});
    } catch {}
  }

  /** Every correction is booked against one virtual "Inventory Adjustment" location. */
  private async getAdjustmentLocation(companyId?: string): Promise<Location> {
    let location = await this.locationRepo.findOne({
      where: companyId
        ? [{ usage: LocationUsage.INVENTORY, companyId }, { usage: LocationUsage.INVENTORY }]
        : { usage: LocationUsage.INVENTORY },
    });
    if (!location) {
      location = await this.locationRepo.save(
        this.locationRepo.create({
          name: ADJUSTMENT_LOCATION_NAME,
          completeName: ADJUSTMENT_LOCATION_NAME,
          usage: LocationUsage.INVENTORY,
          companyId,
        }),
      );
    }
    return location;
  }

  async create(
    dto: CreateInventoryAdjustmentDto,
    companyId?: string,
  ): Promise<InventoryAdjustment> {
    const warehouse = await this.warehouseRepo.findOne({
      where: { id: dto.warehouseId },
    });
    if (!warehouse) {
      throw new NotFoundException(`Warehouse ${dto.warehouseId} not found`);
    }

    const effectiveCompanyId = companyId || warehouse.companyId;

    // Resolve location: Ensure location is an internal warehouse storage location
    let locationId = dto.locationId;
    if (locationId) {
      const loc = await this.locationRepo.findOne({ where: { id: locationId } });
      if (!loc || loc.usage !== LocationUsage.INTERNAL) {
        locationId = undefined;
      }
    }
    if (!locationId && dto.warehouseId) {
      const locations = await this.getWarehouseInternalLocations(dto.warehouseId);
      if (locations.length > 0) {
        locationId = locations[0].id;
      }
    }

    // Auto-generate reference if not provided
    const todayStr = dto.inventoryDate || new Date().toISOString().slice(0, 10);
    const randomSeq = Math.floor(1000 + Math.random() * 9000);
    const ref = dto.reference?.trim() || `${todayStr.slice(0, 4)}/${randomSeq}`;
    const name = dto.name?.trim() || ref;

    const adjustment = this.repo.create({
      reference: ref,
      name,
      warehouseId: dto.warehouseId,
      locationId,
      inventoryType: dto.inventoryType || InventoryType.STOCK_INVENTORY,
      inventoryOf: dto.inventoryOf || InventoryOf.ALL_PRODUCTS,
      categoryId: dto.categoryId || undefined,
      productId: dto.productId || undefined,
      lotNumber: dto.lotNumber || undefined,
      inventoryDate: todayStr,
      notes: dto.notes,
      state: InventoryAdjustmentState.DRAFT,
      companyId: effectiveCompanyId,
      lines: [],
    });

    const saved = await this.repo.save(adjustment);

    // If user provided manual lines
    if (dto.lines && dto.lines.length > 0) {
      const createdLines: InventoryAdjustmentLine[] = [];
      for (const lineDto of dto.lines) {
        let lineLocId = lineDto.locationId || locationId;
        if (lineLocId) {
          const lLoc = await this.locationRepo.findOne({ where: { id: lineLocId } });
          if (!lLoc || lLoc.usage !== LocationUsage.INTERNAL) {
            lineLocId = locationId;
          }
        }
        const theoretical = await this.quantsService.getOnHand(
          lineDto.productId,
          lineLocId!,
        );
        const adjQty = lineDto.adjustmentQuantity !== undefined
          ? Number(lineDto.adjustmentQuantity)
          : (lineDto.countedQuantity !== undefined ? Number(lineDto.countedQuantity) - theoretical : 0);
        const finalCounted = lineDto.countedQuantity !== undefined
          ? Number(lineDto.countedQuantity)
          : theoretical + adjQty;

        createdLines.push(
          this.lineRepo.create({
            adjustmentId: saved.id,
            productId: lineDto.productId,
            locationId: lineLocId || locationId,
            lotNumber: lineDto.lotNumber || undefined,
            theoreticalQuantity: theoretical,
            adjustmentQuantity: adjQty,
            countedQuantity: finalCounted,
            reason: lineDto.reason || undefined,
          }),
        );
      }
      await this.lineRepo.save(createdLines);
    }

    // If user chose to immediately start the inventory session
    if (dto.startImmediately) {
      return this.start(saved.id);
    }

    return this.findOne(saved.id);
  }

  /**
   * Starts inventory count session: changes state from draft -> in_progress
   * and automatically populates product lines with theoretical stock snapshot.
   */
  async start(id: string, companyId?: string): Promise<InventoryAdjustment> {
    const adjustment = await this.findOne(id, companyId);
    if (adjustment.state !== InventoryAdjustmentState.DRAFT) {
      throw new BadRequestException("Only draft adjustments can be started");
    }

    const warehouseLocations = await this.getWarehouseInternalLocations(adjustment.warehouseId);
    const primaryLocationId = adjustment.locationId || warehouseLocations[0].id;

    const targetCompanyId = adjustment.companyId || companyId;

    // If lines not already populated, populate based on inventoryOf scope
    if (!adjustment.lines || adjustment.lines.length === 0) {
      let targetProducts: Product[] = [];

      if (adjustment.inventoryOf === InventoryOf.CATEGORY && adjustment.categoryId) {
        const where: any = { categoryId: adjustment.categoryId, active: true };
        if (targetCompanyId) {
          where.companyId = targetCompanyId;
        }
        targetProducts = await this.productRepo.find({
          where,
          order: { name: "ASC" },
        });
      } else if (adjustment.inventoryOf === InventoryOf.PRODUCT && adjustment.productId) {
        const where: any = { id: adjustment.productId };
        if (targetCompanyId) {
          where.companyId = targetCompanyId;
        }
        const prod = await this.productRepo.findOne({ where });
        if (prod) targetProducts = [prod];
      } else {
        // Strictly all active products belonging to THIS company
        const where: any = { active: true };
        if (targetCompanyId) {
          where.companyId = targetCompanyId;
        }
        targetProducts = await this.productRepo.find({
          where,
          order: { name: "ASC" },
          take: 500,
        });
      }

      const lines: InventoryAdjustmentLine[] = [];
      for (const p of targetProducts) {
        const theoretical = await this.quantsService.getOnHand(p.id, primaryLocationId);
        lines.push(
          this.lineRepo.create({
            adjustmentId: adjustment.id,
            productId: p.id,
            locationId: primaryLocationId,
            lotNumber: p.lotNumber || adjustment.lotNumber || undefined,
            theoreticalQuantity: theoretical,
            adjustmentQuantity: 0, // Starts at 0: adjust up (+) to add stock, down (-) to reduce stock
            countedQuantity: theoretical,
          }),
        );
      }

      if (lines.length > 0) {
        await this.lineRepo.save(lines);
      }
    }

    adjustment.state = InventoryAdjustmentState.IN_PROGRESS;
    await this.repo.save(adjustment);
    return this.findOne(id, companyId);
  }

  async findAll(
    query: PaginationQueryDto & {
      state?: string;
      search?: string;
      warehouseId?: string;
      companyId?: string;
    },
    companyId?: string,
  ): Promise<Paginated<InventoryAdjustment>> {
    const { page = 1, limit = 20, state, search, warehouseId } = query;
    const effectiveCompanyId = companyId || query?.companyId;

    const qb = this.repo
      .createQueryBuilder("adj")
      .leftJoinAndSelect("adj.warehouse", "warehouse")
      .leftJoinAndSelect("adj.location", "location")
      .leftJoinAndSelect("adj.category", "category")
      .leftJoinAndSelect("adj.product", "product")
      .leftJoinAndSelect("adj.lines", "lines")
      .leftJoinAndSelect("lines.product", "lineProduct")
      .leftJoinAndSelect("lines.location", "lineLocation");

    if (state) {
      qb.andWhere("adj.state = :state", { state });
    }
    if (warehouseId) {
      qb.andWhere("adj.warehouseId = :warehouseId", { warehouseId });
    }
    if (effectiveCompanyId) {
      qb.andWhere("adj.companyId = :effectiveCompanyId", { effectiveCompanyId });
    }
    if (search) {
      qb.andWhere(
        "(LOWER(adj.name) LIKE LOWER(:search) OR LOWER(adj.reference) LIKE LOWER(:search) OR LOWER(adj.notes) LIKE LOWER(:search))",
        { search: `%${search}%` },
      );
    }

    qb.orderBy("adj.createdAt", "DESC")
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string, companyId?: string): Promise<InventoryAdjustment> {
    const where: any = { id };
    if (companyId) {
      where.companyId = companyId;
    }
    const adjustment = await this.repo.findOne({
      where,
      relations: [
        "warehouse",
        "location",
        "category",
        "product",
        "lines",
        "lines.product",
        "lines.location",
        "lines.stockMove",
        "lines.stockMove.sourceLocation",
        "lines.stockMove.destLocation",
      ],
    });
    if (!adjustment) {
      throw new NotFoundException(`Inventory Adjustment ${id} not found`);
    }
    return adjustment;
  }

  async updateLine(
    adjustmentId: string,
    lineId: string,
    dto: UpdateInventoryAdjustmentLineDto,
    companyId?: string,
  ): Promise<InventoryAdjustment> {
    const adjustment = await this.findOne(adjustmentId, companyId);
    if (
      adjustment.state !== InventoryAdjustmentState.DRAFT &&
      adjustment.state !== InventoryAdjustmentState.IN_PROGRESS
    ) {
      throw new BadRequestException("Only draft or in-progress adjustments can be edited");
    }
    const line = adjustment.lines.find((l) => l.id === lineId);
    if (!line) {
      throw new NotFoundException(
        `Line ${lineId} not found on this adjustment`,
      );
    }

    const updateData: any = {};
    if (dto.adjustmentQuantity !== undefined) {
      const adj = Number(dto.adjustmentQuantity);
      updateData.adjustmentQuantity = adj;
      updateData.countedQuantity = Number(line.theoreticalQuantity || 0) + adj;
    } else if (dto.countedQuantity !== undefined) {
      updateData.countedQuantity = Number(dto.countedQuantity);
      updateData.adjustmentQuantity =
        Number(dto.countedQuantity) - Number(line.theoreticalQuantity || 0);
    }
    if (dto.lotNumber !== undefined) {
      updateData.lotNumber = dto.lotNumber;
    }
    if (dto.reason !== undefined) {
      updateData.reason = dto.reason;
    }
    await this.lineRepo.update(lineId, updateData);
    return this.findOne(adjustmentId, companyId);
  }

  async addLine(
    id: string,
    dto: {
      productId: string;
      locationId?: string;
      countedQuantity?: number;
      adjustmentQuantity?: number;
      lotNumber?: string;
      reason?: string;
    },
    companyId?: string,
  ): Promise<InventoryAdjustment> {
    const adjustment = await this.findOne(id, companyId);
    if (
      adjustment.state !== InventoryAdjustmentState.DRAFT &&
      adjustment.state !== InventoryAdjustmentState.IN_PROGRESS
    ) {
      throw new BadRequestException("Cannot add lines to a validated adjustment");
    }

    const warehouseLocations = await this.getWarehouseInternalLocations(adjustment.warehouseId);
    const locId = dto.locationId || adjustment.locationId || warehouseLocations[0].id;
    const theoretical = await this.quantsService.getOnHand(dto.productId, locId);

    let lotNumber = dto.lotNumber;
    if (!lotNumber) {
      const prod = await this.productRepo.findOne({ where: { id: dto.productId } });
      if (prod?.lotNumber) {
        lotNumber = prod.lotNumber;
      }
    }

    const adj =
      dto.adjustmentQuantity !== undefined
        ? Number(dto.adjustmentQuantity)
        : dto.countedQuantity !== undefined
        ? Number(dto.countedQuantity) - theoretical
        : 0;
    const counted =
      dto.countedQuantity !== undefined
        ? Number(dto.countedQuantity)
        : theoretical + adj;

    const line = this.lineRepo.create({
      adjustmentId: id,
      productId: dto.productId,
      locationId: locId,
      lotNumber: lotNumber || undefined,
      theoreticalQuantity: theoretical,
      adjustmentQuantity: adj,
      countedQuantity: counted,
      reason: dto.reason || undefined,
    });
    await this.lineRepo.save(line);
    return this.findOne(id, companyId);
  }

  async deleteLine(
    adjustmentId: string,
    lineId: string,
    companyId?: string,
  ): Promise<InventoryAdjustment> {
    const adjustment = await this.findOne(adjustmentId, companyId);
    if (
      adjustment.state !== InventoryAdjustmentState.DRAFT &&
      adjustment.state !== InventoryAdjustmentState.IN_PROGRESS
    ) {
      throw new BadRequestException("Cannot delete lines from a validated adjustment");
    }
    const line = adjustment.lines.find((l) => l.id === lineId);
    if (!line) {
      throw new NotFoundException(`Line ${lineId} not found on this adjustment`);
    }
    await this.lineRepo.delete(lineId);
    return this.findOne(adjustmentId, companyId);
  }

  /**
   * Validates the physical count:
   * For every line with a difference (countedQuantity - theoreticalQuantity, or adjustmentQuantity),
   * creates and validates a corrective StockMove against the virtual Inventory Adjustment location.
   * This automatically updates StockQuant (stock on hand balance increases/decreases).
   */
  async validateAdjustment(id: string, companyId?: string): Promise<InventoryAdjustment> {
    const adjustment = await this.findOne(id, companyId);
    if (adjustment.state === InventoryAdjustmentState.DONE) {
      throw new BadRequestException("This inventory adjustment is already validated");
    }
    if (adjustment.state === InventoryAdjustmentState.CANCELLED) {
      throw new BadRequestException("Cancelled adjustments cannot be validated");
    }

    const adjustmentLocation = await this.getAdjustmentLocation(adjustment.companyId);
    const warehouseLocations = await this.getWarehouseInternalLocations(
      adjustment.warehouseId,
    );
    const fallbackLocationId = adjustment.locationId || warehouseLocations[0].id;

    for (const line of adjustment.lines || []) {
      const theoretical = Number(line.theoreticalQuantity || 0);
      const difference =
        line.adjustmentQuantity !== undefined && line.adjustmentQuantity !== null
          ? Number(line.adjustmentQuantity)
          : line.countedQuantity !== undefined && line.countedQuantity !== null
          ? Number(line.countedQuantity) - theoretical
          : 0;

      if (difference === 0) continue;

      if (difference < 0 && (!line.reason || !line.reason.trim())) {
        const prodName = line.product?.name || `Product ${line.productId}`;
        throw new BadRequestException(
          `Reason required for negative stock adjustment on "${prodName}". Please state why stock is being reduced.`
        );
      }

      let lineLocationId = line.locationId || fallbackLocationId;
      const targetLoc = await this.locationRepo.findOne({ where: { id: lineLocationId } });
      if (!targetLoc || targetLoc.usage !== LocationUsage.INTERNAL) {
        lineLocationId = warehouseLocations[0].id;
      }

      const isGain = difference > 0;
      const qty = Math.abs(difference);

      const move = await this.movesService.create({
        productId: line.productId,
        quantity: qty,
        sourceLocationId: isGain ? adjustmentLocation.id : lineLocationId,
        destLocationId: isGain ? lineLocationId : adjustmentLocation.id,
        reference: `${adjustment.reference || adjustment.name}${line.reason ? ` [Reason: ${line.reason}]` : ""}`,
      });
      await this.movesService.confirm(move.id);
      await this.movesService.validateMove(move.id);

      await this.lineRepo.update(line.id, { stockMoveId: move.id, locationId: lineLocationId });
    }

    adjustment.state = InventoryAdjustmentState.DONE;
    await this.repo.save(adjustment);
    return this.findOne(id, companyId);
  }

  async cancel(id: string, companyId?: string): Promise<InventoryAdjustment> {
    const adjustment = await this.findOne(id, companyId);
    if (adjustment.state === InventoryAdjustmentState.DONE) {
      throw new BadRequestException("Validated adjustments cannot be cancelled");
    }
    adjustment.state = InventoryAdjustmentState.CANCELLED;
    return this.repo.save(adjustment);
  }

  private async getWarehouseInternalLocations(
    warehouseId: string,
  ): Promise<Location[]> {
    const locations = await this.locationRepo.find({
      where: { warehouseId, usage: LocationUsage.INTERNAL },
      order: { name: "ASC" },
    });
    if (!locations.length) {
      throw new BadRequestException("Warehouse has no internal locations");
    }
    return locations;
  }
}
