import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StockMove, StockMoveState } from './entities/stock-move.entity';
import { Product } from '../products/entities/product.entity';
import { Location, LocationUsage } from '../locations/entities/location.entity';
import { CreateStockMoveDto } from './dto/create-stock-move.dto';
import { StockQuantsService } from '../stock-quants/stock-quants.service';
import { StockValuationService } from '../stock-valuation/stock-valuation.service';
import {
  Paginated,
  PaginationQueryDto,
} from '../common/dto/pagination-query.dto';

@Injectable()
export class StockMovesService {
  constructor(
    @InjectRepository(StockMove) private readonly repo: Repository<StockMove>,
    @InjectRepository(Product) private readonly productRepo: Repository<Product>,
    @InjectRepository(Location) private readonly locationRepo: Repository<Location>,
    private readonly quantsService: StockQuantsService,
    private readonly valuationService: StockValuationService,
  ) {}

  async create(dto: CreateStockMoveDto, pickingId?: string): Promise<StockMove> {
    const product = await this.productRepo.findOne({ where: { id: dto.productId } });
    if (!product) throw new BadRequestException('Product not found');

    const move = this.repo.create({
      ...dto,
      uomId: dto.uomId ?? product.uomId,
      pickingId,
      state: StockMoveState.DRAFT,
    });
    return this.repo.save(move);
  }

  async findAll(
    query: PaginationQueryDto & {
      productId?: string;
      locationId?: string;
      state?: string;
      pickingId?: string;
    },
  ): Promise<Paginated<StockMove>> {
    const { page, limit, productId, state, pickingId } = query;
    const where: any = {};
    if (productId) where.productId = productId;
    if (state) where.state = state;
    if (pickingId) where.pickingId = pickingId;

    const [data, total] = await this.repo.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string): Promise<StockMove> {
    const move = await this.repo.findOne({ where: { id } });
    if (!move) throw new NotFoundException(`Stock Move ${id} not found`);
    return move;
  }

  async confirm(id: string): Promise<StockMove> {
    const move = await this.findOne(id);
    if (move.state !== StockMoveState.DRAFT) {
      throw new BadRequestException('Only draft moves can be confirmed');
    }
    move.state = StockMoveState.CONFIRMED;
    return this.repo.save(move);
  }

  /**
   * Validates ("does") a move: applies the quantity delta to stock quants at
   * internal locations on either side, and records a valuation layer if the
   * move crosses the internal/external boundary (receipt, delivery, return,
   * or an inventory-adjustment correction). Internal->internal transfers
   * don't change total valuation, so no layer is recorded for those.
   */
  async validateMove(id: string): Promise<StockMove> {
    let move = await this.findOne(id);
    if (move.state === StockMoveState.DONE) {
      return move;
    }
    if (move.state === StockMoveState.DRAFT) {
      move = await this.confirm(id);
    }
    if (move.state !== StockMoveState.CONFIRMED) {
      throw new BadRequestException('Only confirmed moves can be validated');
    }

    const [sourceLocation, destLocation, product] = await Promise.all([
      this.locationRepo.findOne({ where: { id: move.sourceLocationId } }),
      this.locationRepo.findOne({ where: { id: move.destLocationId } }),
      this.productRepo.findOne({ where: { id: move.productId } }),
    ]);
    if (!sourceLocation || !destLocation) {
      throw new BadRequestException('Move has an invalid source/destination location');
    }

    const quantity = Number(move.quantity);
    const unitCost = Number(product?.costPrice ?? 0);
    const sourceIsInternal = sourceLocation.usage === LocationUsage.INTERNAL;
    const destIsInternal = destLocation.usage === LocationUsage.INTERNAL;

    if (sourceIsInternal) {
      await this.quantsService.adjust(move.productId, move.sourceLocationId, -quantity);
    }
    if (destIsInternal) {
      await this.quantsService.adjust(move.productId, move.destLocationId, quantity);
    }

    if (!sourceIsInternal && destIsInternal) {
      // Goods entering the internal network (receipt, positive adjustment, return-in)
      await this.valuationService.recordLayer({
        productId: move.productId,
        quantity,
        unitCost,
        stockMoveId: move.id,
        description: `Incoming: ${sourceLocation.name} -> ${destLocation.name}`,
      });
    } else if (sourceIsInternal && !destIsInternal) {
      // Goods leaving the internal network (delivery, negative adjustment, return-out)
      await this.valuationService.recordLayer({
        productId: move.productId,
        quantity: -quantity,
        unitCost,
        stockMoveId: move.id,
        description: `Outgoing: ${sourceLocation.name} -> ${destLocation.name}`,
      });
    }
    // internal -> internal, or external -> external: no valuation change

    move.state = StockMoveState.DONE;
    move.effectiveDate = new Date();
    move.unitCost = unitCost;
    return this.repo.save(move);
  }

  async cancel(id: string): Promise<StockMove> {
    const move = await this.findOne(id);
    if (move.state === StockMoveState.DONE) {
      throw new BadRequestException('A completed move cannot be cancelled');
    }
    move.state = StockMoveState.CANCELLED;
    return this.repo.save(move);
  }
}
