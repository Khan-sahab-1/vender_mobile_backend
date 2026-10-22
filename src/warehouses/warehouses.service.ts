import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Warehouse } from './entities/warehouse.entity';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import {
  Paginated,
  PaginationQueryDto,
} from '../common/dto/pagination-query.dto';
import { OperationTypesService } from '../operation-types/operation-types.service';

@Injectable()
export class WarehousesService {
  constructor(
    @InjectRepository(Warehouse) private readonly repo: Repository<Warehouse>,
    private readonly operationTypesService: OperationTypesService,
  ) {}

  async create(dto: CreateWarehouseDto, companyId?: string) {
    const effectiveCompanyId = companyId || (dto as any).companyId;
    const exists = await this.repo.findOne({
      where: effectiveCompanyId ? { code: dto.code, companyId: effectiveCompanyId } : { code: dto.code },
    });
    if (exists) throw new ConflictException(`Warehouse code "${dto.code}" already in use`);
    const saved = await this.repo.save(this.repo.create({ ...dto, companyId: effectiveCompanyId }));

    // Automatically generate standard ERP Operation Types (Receipts, Deliveries, Internal Transfers)
    try {
      await this.operationTypesService.ensureDefaultOperationTypesForWarehouse(
        saved,
        effectiveCompanyId,
      );
    } catch (err: any) {
      console.warn(`Could not auto-generate operation types for warehouse ${saved.id}: ${err.message}`);
    }

    return saved;
  }

  async findAll(
    query: PaginationQueryDto & { companyId?: string },
    companyId?: string,
  ): Promise<Paginated<Warehouse>> {
    const page = Number(query?.page) > 0 ? Number(query.page) : 1;
    const limit = Number(query?.limit) > 0 ? Number(query.limit) : 20;
    const { search, active } = query || {};
    const effectiveCompanyId = companyId || query?.companyId;

    const where: any = {};
    if (search) where.name = ILike(`%${search}%`);
    if (active !== undefined) where.active = active;
    if (effectiveCompanyId) {
      where.companyId = effectiveCompanyId;
    }

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
    if (!entity) throw new NotFoundException(`Warehouse ${id} not found`);
    return entity;
  }

  async update(id: string, dto: UpdateWarehouseDto) {
    const entity = await this.findOne(id);
    Object.assign(entity, dto);
    return this.repo.save(entity);
  }

  async remove(id: string) {
    const entity = await this.findOne(id);
    entity.active = false;
    await this.repo.save(entity);
  }
}
