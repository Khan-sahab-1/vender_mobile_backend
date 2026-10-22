import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import {
  Pricelist,
  PricelistItem,
  PricelistComputeType,
} from './entities/pricelist.entity';
import { Product } from '../products/entities/product.entity';
import { CreatePricelistDto } from './dto/create-pricelist.dto';
import { UpdatePricelistDto } from './dto/update-pricelist.dto';
import {
  Paginated,
  PaginationQueryDto,
} from '../common/dto/pagination-query.dto';

@Injectable()
export class PricelistsService {
  constructor(
    @InjectRepository(Pricelist) private readonly repo: Repository<Pricelist>,
    @InjectRepository(PricelistItem)
    private readonly itemRepo: Repository<PricelistItem>,
    @InjectRepository(Product) private readonly productRepo: Repository<Product>,
  ) {}

  create(dto: CreatePricelistDto) {
    const entity = this.repo.create({
      name: dto.name,
      currency: dto.currency ?? 'USD',
      items: dto.items?.map((i) => this.itemRepo.create(i)) ?? [],
    });
    return this.repo.save(entity);
  }

  async findAll(query: PaginationQueryDto): Promise<Paginated<Pricelist>> {
    const { page, limit, search, active } = query;
    const where: any = {};
    if (search) where.name = ILike(`%${search}%`);
    if (active !== undefined) where.active = active;

    const [data, total] = await this.repo.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: { name: 'ASC' },
    });
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException(`Pricelist ${id} not found`);
    return entity;
  }

  async update(id: string, dto: UpdatePricelistDto) {
    const entity = await this.findOne(id);
    entity.name = dto.name ?? entity.name;
    entity.currency = dto.currency ?? entity.currency;

    if (dto.items) {
      await this.itemRepo.delete({ pricelistId: id });
      entity.items = dto.items.map((i) => this.itemRepo.create(i));
    }
    return this.repo.save(entity);
  }

  async remove(id: string) {
    const entity = await this.findOne(id);
    entity.active = false;
    await this.repo.save(entity);
  }

  /**
   * Computes the unit price for a product under a pricelist, mirroring Odoo's
   * pricelist rule precedence: product-specific rule > category rule > all-products rule,
   * picking the highest-sequence match whose min_quantity is satisfied.
   */
  async getPrice(
    pricelistId: string,
    productId: string,
    quantity = 1,
  ): Promise<{ price: number; ruleApplied?: string }> {
    const product = await this.productRepo.findOne({ where: { id: productId } });
    if (!product) throw new NotFoundException(`Product ${productId} not found`);

    const pricelist = await this.findOne(pricelistId);
    const candidates = (pricelist.items ?? [])
      .filter((i) => quantity >= Number(i.minQuantity ?? 0))
      .filter(
        (i) =>
          i.appliedOn === 'product'
            ? i.productId === productId
            : i.appliedOn === 'category'
              ? i.categoryId === product.categoryId
              : true,
      )
      .sort((a, b) => {
        const rank = (i: PricelistItem) =>
          i.appliedOn === 'product' ? 0 : i.appliedOn === 'category' ? 1 : 2;
        return rank(a) - rank(b) || a.sequence - b.sequence;
      });

    const rule = candidates[0];
    if (!rule) return { price: Number(product.salesPrice) };

    let price = Number(product.salesPrice);
    if (rule.computeType === PricelistComputeType.FIXED && rule.fixedPrice != null) {
      price = Number(rule.fixedPrice);
    } else if (
      rule.computeType === PricelistComputeType.PERCENTAGE &&
      rule.percentage != null
    ) {
      price = price * (1 + Number(rule.percentage) / 100);
    } else if (
      rule.computeType === PricelistComputeType.FORMULA &&
      rule.percentage != null
    ) {
      price = Number(product.costPrice) * (1 + Number(rule.percentage) / 100);
    }

    return { price: Math.round(price * 100) / 100, ruleApplied: rule.id };
  }
}
