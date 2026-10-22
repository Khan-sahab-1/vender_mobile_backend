import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StockValuationLayer } from './entities/stock-valuation-layer.entity';
import {
  Paginated,
  PaginationQueryDto,
} from '../common/dto/pagination-query.dto';

export interface ValuationSummary {
  productId: string;
  productName: string;
  quantityOnHand: number;
  totalValue: number;
  averageCost: number;
}

@Injectable()
export class StockValuationService {
  constructor(
    @InjectRepository(StockValuationLayer)
    private readonly repo: Repository<StockValuationLayer>,
  ) {}

  /** Called by StockMovesService.validateMove() — the only writer of layers. */
  async recordLayer(params: {
    productId: string;
    quantity: number;
    unitCost: number;
    stockMoveId?: string;
    description?: string;
  }): Promise<StockValuationLayer> {
    const layer = this.repo.create({
      ...params,
      value: params.quantity * params.unitCost,
    });
    return this.repo.save(layer);
  }

  async findAll(
    query: PaginationQueryDto & { productId?: string },
  ): Promise<Paginated<StockValuationLayer>> {
    const { page, limit, productId } = query;
    const where: any = {};
    if (productId) where.productId = productId;

    const [data, total] = await this.repo.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  private aggregate(layers: StockValuationLayer[]): ValuationSummary[] {
    const map = new Map<string, ValuationSummary>();
    for (const layer of layers) {
      const key = layer.productId;
      const entry =
        map.get(key) ??
        ({
          productId: key,
          productName: layer.product?.name ?? key,
          quantityOnHand: 0,
          totalValue: 0,
          averageCost: 0,
        } as ValuationSummary);
      entry.quantityOnHand += Number(layer.quantity);
      entry.totalValue += Number(layer.value);
      map.set(key, entry);
    }
    return Array.from(map.values()).map(entry => ({
      ...entry,
      quantityOnHand: Math.round(entry.quantityOnHand * 10000) / 10000,
      totalValue: Math.round(entry.totalValue * 100) / 100,
      averageCost:
        entry.quantityOnHand !== 0
          ? Math.round((entry.totalValue / entry.quantityOnHand) * 10000) / 10000
          : 0,
    }));
  }

  /** Current inventory valuation for every product that has ever moved. */
  async getSummary(): Promise<ValuationSummary[]> {
    const layers = await this.repo.find();
    return this.aggregate(layers).sort((a, b) => b.totalValue - a.totalValue);
  }

  /** Current inventory valuation for one product. */
  async getSummaryForProduct(productId: string): Promise<ValuationSummary> {
    const layers = await this.repo.find({ where: { productId } });
    const [summary] = this.aggregate(layers);
    return (
      summary ?? {
        productId,
        productName: productId,
        quantityOnHand: 0,
        totalValue: 0,
        averageCost: 0,
      }
    );
  }
}
