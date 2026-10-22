import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, In, Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { Tax } from '../taxes/entities/tax.entity';
import { StockQuant } from '../stock-quants/entities/stock-quant.entity';
import { LocationUsage } from '../locations/entities/location.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import {
  Paginated,
  PaginationQueryDto,
} from '../common/dto/pagination-query.dto';

@Injectable()
export class ProductsService implements OnModuleInit {
  constructor(
    @InjectRepository(Product) private readonly repo: Repository<Product>,
    @InjectRepository(Tax) private readonly taxRepo: Repository<Tax>,
    @InjectRepository(StockQuant) private readonly quantRepo: Repository<StockQuant>,
  ) {}

  async onModuleInit() {
    try {
      await this.repo.query(`
        ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "tracking" varchar DEFAULT 'none';
        ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "lot_number" varchar;
      `).catch(() => {});
    } catch {}
  }

  private async resolveTaxes(ids?: string[]): Promise<Tax[] | undefined> {
    if (!ids) return undefined;
    if (ids.length === 0) return [];
    return this.taxRepo.find({ where: { id: In(ids) } });
  }

  async create(dto: CreateProductDto, companyId?: string) {
    const { salesTaxIds, purchaseTaxIds, lotSerialNumber, ...rest } = dto;
    const effectiveCompanyId = companyId || dto.companyId;
    const finalLot = dto.lotNumber || lotSerialNumber;
    const entity = this.repo.create({
      ...rest,
      tracking: dto.tracking || 'none',
      lotNumber: finalLot || undefined,
      companyId: effectiveCompanyId || undefined,
      purchaseUomId: dto.purchaseUomId ?? dto.uomId,
    });
    entity.salesTaxes = (await this.resolveTaxes(salesTaxIds)) ?? [];
    entity.purchaseTaxes = (await this.resolveTaxes(purchaseTaxIds)) ?? [];
    return this.repo.save(entity);
  }

  async findAll(
    query: PaginationQueryDto & { categoryId?: string; type?: string; companyId?: string },
    companyId?: string,
  ): Promise<Paginated<Product>> {
    const page = Math.max(1, Number(query?.page) || 1);
    const limit = Math.max(1, Number(query?.limit) || 20);
    const { search, active, categoryId, type } = query || {};
    const effectiveCompanyId = companyId || query?.companyId;

    let where: any;
    if (search) {
      const pattern = ILike(`%${search}%`);
      const baseFilter: any = {};
      if (active !== undefined) baseFilter.active = active;
      if (categoryId) baseFilter.categoryId = categoryId;
      if (type) baseFilter.type = type;
      if (effectiveCompanyId) baseFilter.companyId = effectiveCompanyId;

      where = [
        { name: pattern, ...baseFilter },
        { sku: pattern, ...baseFilter },
        { barcode: pattern, ...baseFilter },
        { lotNumber: pattern, ...baseFilter },
      ];
    } else {
      where = {};
      if (active !== undefined) where.active = active;
      if (categoryId) where.categoryId = categoryId;
      if (type) where.type = type;
      if (effectiveCompanyId) where.companyId = effectiveCompanyId;
    }

    const [data, total] = await this.repo.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: { name: 'ASC' },
      relations: ['salesTaxes', 'purchaseTaxes', 'purchaseUom', 'category', 'uom'],
    });

    const productIds = data.map((p) => p.id);
    if (productIds.length > 0) {
      const quants = await this.quantRepo.find({
        where: { productId: In(productIds) },
        relations: ['location'],
      });
      const onHandMap: Record<string, number> = {};
      for (const q of quants) {
        if (!q.location || q.location.usage === LocationUsage.INTERNAL) {
          onHandMap[q.productId] = (onHandMap[q.productId] || 0) + Number(q.quantity || 0);
        }
      }
      for (const p of data) {
        (p as any).onHandQuantity = onHandMap[p.id] ?? 0;
      }
    }

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string, companyId?: string) {
    const where: any = { id };
    if (companyId) where.companyId = companyId;
    const entity = await this.repo.findOne({
      where,
      relations: ['salesTaxes', 'purchaseTaxes', 'purchaseUom', 'category', 'uom'],
    });
    if (!entity) throw new NotFoundException(`Product ${id} not found`);

    const quants = await this.quantRepo.find({
      where: { productId: id },
      relations: ['location'],
    });
    const totalOnHand = quants
      .filter((q) => !q.location || q.location.usage === LocationUsage.INTERNAL)
      .reduce((sum, q) => sum + Number(q.quantity || 0), 0);
    (entity as any).onHandQuantity = totalOnHand;

    return entity;
  }

  async getLocationsStock(productId: string, companyId?: string) {
    const product = await this.findOne(productId, companyId);
    const quants = await this.quantRepo.find({
      where: { productId },
      relations: ['location', 'location.warehouse'],
      order: { quantity: 'DESC' },
    });

    const locations = quants.map((q) => {
      const qty = Number(q.quantity || 0);
      const reserved = Number(q.reservedQuantity || 0);
      return {
        quantId: q.id,
        locationId: q.locationId,
        locationName: q.location?.name || 'Stock Location',
        completeName: q.location?.completeName || q.location?.name || 'Stock Location',
        warehouseName: q.location?.warehouse?.name || 'Main Warehouse',
        usage: q.location?.usage || 'internal',
        quantity: qty,
        reservedQuantity: reserved,
        availableQuantity: qty - reserved,
      };
    });

    const internalLocations = locations.filter((l) => l.usage === 'internal');
    const totalOnHand = internalLocations.reduce((sum, l) => sum + l.quantity, 0);
    const totalReserved = internalLocations.reduce((sum, l) => sum + l.reservedQuantity, 0);

    return {
      product: {
        id: product.id,
        name: product.name,
        sku: product.sku,
        lotNumber: product.lotNumber,
        tracking: product.tracking,
        uom: product.uom?.name || 'Units',
      },
      totalOnHand,
      totalReserved,
      totalAvailable: totalOnHand - totalReserved,
      locations,
    };
  }

  async update(id: string, dto: UpdateProductDto, companyId?: string) {
    const entity = await this.findOne(id, companyId);
    const { salesTaxIds, purchaseTaxIds, lotSerialNumber, ...rest } = dto;
    Object.assign(entity, rest);

    if (dto.lotNumber !== undefined || lotSerialNumber !== undefined) {
      entity.lotNumber = dto.lotNumber || lotSerialNumber || undefined;
    }
    if (dto.tracking !== undefined) {
      entity.tracking = dto.tracking;
    }

    if (salesTaxIds !== undefined) {
      entity.salesTaxes = (await this.resolveTaxes(salesTaxIds)) ?? [];
    }
    if (purchaseTaxIds !== undefined) {
      entity.purchaseTaxes = (await this.resolveTaxes(purchaseTaxIds)) ?? [];
    }
    return this.repo.save(entity);
  }

  async remove(id: string, companyId?: string) {
    const entity = await this.findOne(id, companyId);
    entity.active = false;
    await this.repo.save(entity);
  }
}
