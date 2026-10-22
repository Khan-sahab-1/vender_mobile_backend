import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StockQuant } from './entities/stock-quant.entity';
import {
  Paginated,
  PaginationQueryDto,
} from '../common/dto/pagination-query.dto';

@Injectable()
export class StockQuantsService {
  constructor(
    @InjectRepository(StockQuant) private readonly repo: Repository<StockQuant>,
  ) {}

  async findAll(
    query: PaginationQueryDto & { productId?: string; locationId?: string },
  ): Promise<Paginated<StockQuant>> {
    const { page, limit, productId, locationId } = query;
    const where: any = {};
    if (productId) where.productId = productId;
    if (locationId) where.locationId = locationId;

    const [data, total] = await this.repo.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: { updatedAt: 'DESC' },
    });
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getOnHand(productId: string, locationId: string): Promise<number> {
    const quant = await this.repo.findOne({ where: { productId, locationId } });
    return quant ? Number(quant.quantity) : 0;
  }

  /**
   * Applies a signed quantity delta to a product's quant at a location,
   * creating the quant row on first touch. This is the ONLY place quantity
   * on hand changes — always called from StockMovesService.validateMove().
   */
  async adjust(productId: string, locationId: string, delta: number): Promise<StockQuant> {
    let quant = await this.repo.findOne({ where: { productId, locationId } });
    if (!quant) {
      quant = this.repo.create({ productId, locationId, quantity: 0, reservedQuantity: 0 });
    }
    quant.quantity = Number(quant.quantity) + delta;
    return this.repo.save(quant);
  }
}
