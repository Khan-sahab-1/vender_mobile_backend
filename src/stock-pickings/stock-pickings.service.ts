import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { StockPicking } from "./entities/stock-picking.entity";
import { PickingState, PickingType } from "./enums/stock-picking.enum";
import { StockMoveState } from "../stock-moves/entities/stock-move.entity";
import { Warehouse } from "../warehouses/entities/warehouse.entity";
import { OperationType } from "../operation-types/entities/operation-type.entity";
import { CreateStockPickingDto } from "./dto/create-stock-picking.dto";
import { StockMovesService } from "../stock-moves/stock-moves.service";
import {
  Paginated,
  PaginationQueryDto,
} from "../common/dto/pagination-query.dto";

const NAME_PREFIX: Record<PickingType, string> = {
  [PickingType.RECEIPT]: "IN",
  [PickingType.DELIVERY]: "OUT",
  [PickingType.INTERNAL]: "INT",
  [PickingType.RETURN]: "RET",
};

@Injectable()
export class StockPickingsService {
  constructor(
    @InjectRepository(StockPicking)
    private readonly repo: Repository<StockPicking>,
    @InjectRepository(Warehouse)
    private readonly warehouseRepo: Repository<Warehouse>,
    @InjectRepository(OperationType)
    private readonly operationTypeRepo: Repository<OperationType>,
    private readonly movesService: StockMovesService,
  ) {}

  private async generateName(
    pickingType: PickingType,
    warehouseId?: string,
    operationType?: OperationType,
  ): Promise<string> {
    const warehouse = warehouseId
      ? await this.warehouseRepo.findOne({ where: { id: warehouseId } })
      : null;
    const where: any = operationType
      ? { operationTypeId: operationType.id }
      : { pickingType };
    if (!operationType && warehouseId) where.warehouseId = warehouseId;
    const count = await this.repo.count({ where });
    const seq = String(count + 1).padStart(5, "0");
    return `${warehouse?.code ?? "WH"}/${operationType?.sequencePrefix ?? NAME_PREFIX[pickingType]}/${seq}`;
  }

  async create(dto: CreateStockPickingDto): Promise<StockPicking> {
    const operationType = dto.operationTypeId
      ? await this.operationTypeRepo.findOne({
          where: { id: dto.operationTypeId },
        })
      : null;
    if (dto.operationTypeId && !operationType) {
      throw new NotFoundException(
        `Operation type ${dto.operationTypeId} not found`,
      );
    }
    if (operationType && !operationType.active) {
      throw new BadRequestException("Operation type is inactive");
    }

    const pickingType = operationType?.pickingType ?? dto.pickingType;
    const warehouseId = dto.warehouseId ?? operationType?.warehouseId;
    const sourceLocationId =
      dto.sourceLocationId ?? operationType?.defaultSourceLocationId;
    const destLocationId =
      dto.destLocationId ?? operationType?.defaultDestLocationId;
    if (!pickingType || !sourceLocationId || !destLocationId) {
      throw new BadRequestException(
        "Operation type or picking type with source and destination locations is required",
      );
    }
    if (
      operationType &&
      dto.warehouseId &&
      dto.warehouseId !== operationType.warehouseId
    ) {
      throw new BadRequestException(
        "Warehouse must match the selected operation type",
      );
    }

    const name = await this.generateName(
      pickingType,
      warehouseId,
      operationType ?? undefined,
    );
    const picking = await this.repo.save(
      this.repo.create({
        name,
        pickingType,
        operationTypeId: operationType?.id,
        warehouseId,
        sourceLocationId,
        destLocationId,
        partnerId: dto.partnerId,
        scheduledDate: dto.scheduledDate
          ? new Date(dto.scheduledDate)
          : undefined,
        origin: dto.origin,
        state: PickingState.DRAFT,
      }),
    );

    for (const moveDto of dto.moves) {
      await this.movesService.create(
        {
          productId: moveDto.productId,
          quantity: moveDto.quantity,
          uomId: moveDto.uomId,
          sourceLocationId,
          destLocationId,
        },
        picking.id,
      );
    }

    return this.findOne(picking.id);
  }

  async findAll(
    query: PaginationQueryDto & {
      pickingType?: string;
      state?: string;
      warehouseId?: string;
      operationTypeId?: string;
    },
  ): Promise<Paginated<StockPicking>> {
    const { page, limit, pickingType, state, warehouseId, operationTypeId } =
      query;
    const where: any = {};
    if (pickingType) where.pickingType = pickingType;
    if (state) where.state = state;
    if (warehouseId) where.warehouseId = warehouseId;
    if (operationTypeId) where.operationTypeId = operationTypeId;

    const [data, total] = await this.repo.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: "DESC" },
    });
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string): Promise<StockPicking> {
    const picking = await this.repo.findOne({ where: { id } });
    if (!picking) throw new NotFoundException(`Stock Picking ${id} not found`);
    return picking;
  }

  async confirm(id: string): Promise<StockPicking> {
    const picking = await this.findOne(id);
    if (picking.state !== PickingState.DRAFT) {
      throw new BadRequestException("Only draft transfers can be confirmed");
    }
    for (const move of picking.moves || []) {
      if (move.state === StockMoveState.DRAFT) {
        await this.movesService.confirm(move.id);
      }
    }
    await this.repo.update(id, { state: PickingState.CONFIRMED });
    return this.findOne(id);
  }

  async validatePicking(id: string): Promise<StockPicking> {
    const picking = await this.findOne(id);
    if (
      picking.state !== PickingState.CONFIRMED &&
      picking.state !== PickingState.DRAFT &&
      picking.state !== PickingState.DONE
    ) {
      throw new BadRequestException(
        "Only draft or confirmed transfers can be validated",
      );
    }

    // Business Rule: For incoming receipts linked to a Purchase Order,
    // the Vendor Bill (Invoice) must be validated before stock receipt can be validated!
    if (picking.origin || picking.id) {
      try {
        const po = await this.repo.manager
          .createQueryBuilder()
          .select("po")
          .from("purchase_orders", "po")
          .leftJoinAndSelect("po.vendorBill", "vendorBill")
          .where("po.name = :origin OR po.stock_picking_id = :pickingId", {
            origin: picking.origin || "",
            pickingId: picking.id,
          })
          .getOne();

        if (po && (po as any).vendorBill) {
          const bill = (po as any).vendorBill;
          if (bill.state === "draft") {
            throw new BadRequestException(
              `Cannot validate stock receipt: The linked Vendor Bill (${bill.billNumber}) must be validated first (currently in draft). Please validate the invoice before receiving goods into stock.`,
            );
          }
        }
      } catch (err) {
        if (err instanceof BadRequestException) throw err;
      }
    }

    for (const move of picking.moves || []) {
      if (move.state === StockMoveState.DRAFT) {
        await this.movesService.confirm(move.id);
      }
      if (
        move.state !== StockMoveState.DONE &&
        move.state !== StockMoveState.CANCELLED
      ) {
        await this.movesService.validateMove(move.id);
      }
    }
    await this.repo.update(id, {
      state: PickingState.DONE,
      effectiveDate: new Date(),
    });
    return this.findOne(id);
  }

  async cancel(id: string): Promise<StockPicking> {
    const picking = await this.findOne(id);
    if (picking.state === PickingState.DONE) {
      throw new BadRequestException("A completed transfer cannot be cancelled");
    }
    for (const move of picking.moves || []) {
      if (
        move.state !== StockMoveState.DONE &&
        move.state !== StockMoveState.CANCELLED
      ) {
        await this.movesService.cancel(move.id);
      }
    }
    await this.repo.update(id, { state: PickingState.CANCELLED });
    return this.findOne(id);
  }

  /** Creates a draft RETURN picking that reverses a completed transfer's moves. */
  async createReturn(id: string): Promise<StockPicking> {
    const original = await this.findOne(id);
    if (original.state !== PickingState.DONE) {
      throw new BadRequestException(
        "Only a completed transfer can be returned",
      );
    }

    const returnPicking = await this.create({
      pickingType: PickingType.RETURN,
      warehouseId: original.warehouseId,
      sourceLocationId: original.destLocationId,
      destLocationId: original.sourceLocationId,
      partnerId: original.partnerId,
      origin: `Return of ${original.name}`,
      moves: original.moves.map((m) => ({
        productId: m.productId,
        quantity: Number(m.quantity),
        uomId: m.uomId,
      })),
    });

    await this.repo.update(returnPicking.id, { originPickingId: original.id });
    return this.findOne(returnPicking.id);
  }
}
