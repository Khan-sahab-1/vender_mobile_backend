import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ILike, Repository } from "typeorm";
import { Location, LocationUsage } from "../locations/entities/location.entity";
import { Warehouse } from "../warehouses/entities/warehouse.entity";
import { Paginated } from "../common/dto/pagination-query.dto";
import { CreateOperationTypeDto } from "./dto/create-operation-type.dto";
import { OperationTypeQueryDto } from "./dto/operation-type-query.dto";
import { UpdateOperationTypeDto } from "./dto/update-operation-type.dto";
import { OperationType } from "./entities/operation-type.entity";
import { PickingType } from "../stock-pickings/enums/stock-picking.enum";

@Injectable()
export class OperationTypesService {
  constructor(
    @InjectRepository(OperationType)
    private readonly repo: Repository<OperationType>,
    @InjectRepository(Warehouse)
    private readonly warehouseRepo: Repository<Warehouse>,
    @InjectRepository(Location)
    private readonly locationRepo: Repository<Location>,
  ) {}

  async create(
    dto: CreateOperationTypeDto,
    companyId?: string,
  ): Promise<OperationType> {
    await this.validateReferences(dto);
    const effectiveCompanyId = companyId || dto.companyId;
    return this.repo.save(
      this.repo.create({
        ...dto,
        companyId: effectiveCompanyId,
        active: dto.active ?? true,
        sequencePrefix:
          dto.sequencePrefix ?? this.defaultPrefix(dto.pickingType),
      }),
    );
  }

  async findAll(
    query: OperationTypeQueryDto,
    companyId?: string,
  ): Promise<Paginated<OperationType>> {
    const page = Number(query?.page) > 0 ? Number(query.page) : 1;
    const limit = Number(query?.limit) > 0 ? Number(query.limit) : 20;
    const { warehouseId, active, pickingType, search } = query || {};
    const effectiveCompanyId = companyId || query?.companyId;

    const where: any = {};
    if (warehouseId) where.warehouseId = warehouseId;
    if (active !== undefined) where.active = active;
    if (pickingType) where.pickingType = pickingType;
    if (effectiveCompanyId) where.companyId = effectiveCompanyId;
    if (search) where.name = ILike(`%${search}%`);

    const [data, total] = await this.repo.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: { name: "ASC" },
      relations: ["warehouse", "defaultSourceLocation", "defaultDestLocation"],
    });
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string): Promise<OperationType> {
    const operationType = await this.repo.findOne({
      where: { id },
      relations: ["warehouse", "defaultSourceLocation", "defaultDestLocation"],
    });
    if (!operationType)
      throw new NotFoundException(`Operation type ${id} not found`);
    return operationType;
  }

  async update(
    id: string,
    dto: UpdateOperationTypeDto,
  ): Promise<OperationType> {
    const operationType = await this.findOne(id);
    const merged = { ...operationType, ...dto };
    await this.validateReferences(merged);
    Object.assign(operationType, dto);
    return this.repo.save(operationType);
  }

  async remove(id: string): Promise<void> {
    const operationType = await this.findOne(id);
    operationType.active = false;
    await this.repo.save(operationType);
  }

  /**
   * Automatically creates standard ERP Operation Types for a Warehouse:
   * 1. Receipts (Vendor -> Stock)
   * 2. Delivery Orders (Stock -> Customer)
   * 3. Internal Transfers (Stock -> Stock)
   */
  async ensureDefaultOperationTypesForWarehouse(
    warehouse: Warehouse,
    companyId?: string,
  ): Promise<OperationType[]> {
    const effectiveCompanyId = companyId || warehouse.companyId;

    // Find standard locations for this warehouse
    let stockLoc = await this.locationRepo.findOne({
      where: { warehouseId: warehouse.id, usage: LocationUsage.INTERNAL },
    });
    let vendorLoc = await this.locationRepo.findOne({
      where: { warehouseId: warehouse.id, usage: LocationUsage.VENDOR },
    });
    let custLoc = await this.locationRepo.findOne({
      where: { warehouseId: warehouse.id, usage: LocationUsage.CUSTOMER },
    });

    // Fallbacks if not warehouse-specific
    if (!vendorLoc && effectiveCompanyId) {
      vendorLoc = await this.locationRepo.findOne({
        where: { usage: LocationUsage.VENDOR, companyId: effectiveCompanyId },
      });
    }
    if (!custLoc && effectiveCompanyId) {
      custLoc = await this.locationRepo.findOne({
        where: { usage: LocationUsage.CUSTOMER, companyId: effectiveCompanyId },
      });
    }

    // If locations still don't exist, create minimal locations
    const whPrefix = warehouse.code || "WH";
    if (!stockLoc) {
      stockLoc = await this.locationRepo.save(
        this.locationRepo.create({
          name: "Stock",
          completeName: `${whPrefix} / Stock`,
          usage: LocationUsage.INTERNAL,
          warehouseId: warehouse.id,
          companyId: effectiveCompanyId,
        }),
      );
    }
    if (!vendorLoc) {
      vendorLoc = await this.locationRepo.save(
        this.locationRepo.create({
          name: `${whPrefix} Vendors`,
          completeName: `${whPrefix} Vendors`,
          usage: LocationUsage.VENDOR,
          warehouseId: warehouse.id,
          companyId: effectiveCompanyId,
        }),
      );
    }
    if (!custLoc) {
      custLoc = await this.locationRepo.save(
        this.locationRepo.create({
          name: `${whPrefix} Customers`,
          completeName: `${whPrefix} Customers`,
          usage: LocationUsage.CUSTOMER,
          warehouseId: warehouse.id,
          companyId: effectiveCompanyId,
        }),
      );
    }

    const configs = [
      {
        name: `${warehouse.name}: Receipts`,
        pickingType: PickingType.RECEIPT,
        defaultSourceLocationId: vendorLoc.id,
        defaultDestLocationId: stockLoc.id,
        sequencePrefix: `${whPrefix}/IN`,
      },
      {
        name: `${warehouse.name}: Delivery Orders`,
        pickingType: PickingType.DELIVERY,
        defaultSourceLocationId: stockLoc.id,
        defaultDestLocationId: custLoc.id,
        sequencePrefix: `${whPrefix}/OUT`,
      },
      {
        name: `${warehouse.name}: Internal Transfers`,
        pickingType: PickingType.INTERNAL,
        defaultSourceLocationId: stockLoc.id,
        defaultDestLocationId: stockLoc.id,
        sequencePrefix: `${whPrefix}/INT`,
      },
    ];

    const results: OperationType[] = [];
    for (const cfg of configs) {
      let existing = await this.repo.findOne({
        where: {
          warehouseId: warehouse.id,
          pickingType: cfg.pickingType,
        },
      });

      if (!existing) {
        existing = await this.repo.save(
          this.repo.create({
            ...cfg,
            warehouseId: warehouse.id,
            companyId: effectiveCompanyId,
            active: true,
          }),
        );
      }
      results.push(existing);
    }

    return results;
  }

  private async validateReferences(
    dto: Pick<
      CreateOperationTypeDto,
      "warehouseId" | "defaultSourceLocationId" | "defaultDestLocationId"
    >,
  ): Promise<void> {
    const [warehouse, source, destination] = await Promise.all([
      this.warehouseRepo.findOne({ where: { id: dto.warehouseId } }),
      this.locationRepo.findOne({ where: { id: dto.defaultSourceLocationId } }),
      this.locationRepo.findOne({ where: { id: dto.defaultDestLocationId } }),
    ]);
    if (!warehouse) throw new BadRequestException("Warehouse not found");
    if (!source || !destination)
      throw new BadRequestException(
        "Default source or destination location not found",
      );
  }

  private defaultPrefix(pickingType: string): string {
    return (
      { receipt: "IN", delivery: "OUT", internal: "INT", return: "RET" }[
        pickingType
      ] ?? "OP"
    );
  }
}
