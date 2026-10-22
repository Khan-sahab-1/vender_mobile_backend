import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Location } from './entities/location.entity';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import {
  Paginated,
  PaginationQueryDto,
} from '../common/dto/pagination-query.dto';

@Injectable()
export class LocationsService implements OnModuleInit {
  constructor(
    @InjectRepository(Location) private readonly repo: Repository<Location>,
  ) {}

  async onModuleInit() {
    try {
      await this.repo.query(`
        ALTER TABLE "locations" ADD COLUMN IF NOT EXISTS "company_id" uuid;
      `);
    } catch {
      // Ignore if table does not exist yet
    }
  }

  private async computeCompleteName(name: string, parentId?: string) {
    if (!parentId) return name;
    const parent = await this.repo.findOne({ where: { id: parentId } });
    if (!parent) throw new BadRequestException('Parent location not found');
    return `${parent.completeName ?? parent.name} / ${name}`;
  }

  async create(dto: CreateLocationDto, companyId?: string) {
    const effectiveCompanyId = companyId || dto.companyId;
    const completeName = await this.computeCompleteName(dto.name, dto.parentId);
    const entity = this.repo.create({
      ...dto,
      completeName,
      companyId: effectiveCompanyId,
    });
    return this.repo.save(entity);
  }

  async findAll(
    query: PaginationQueryDto & {
      warehouseId?: string;
      usage?: string;
      companyId?: string;
    },
    companyId?: string,
  ): Promise<Paginated<Location>> {
    const page = Number(query?.page) > 0 ? Number(query.page) : 1;
    const limit = Number(query?.limit) > 0 ? Number(query.limit) : 20;
    const { search, active, warehouseId, usage } = query || {};
    const effectiveCompanyId = companyId || query?.companyId;

    let where: any;
    if (search) {
      where = {
        name: ILike(`%${search}%`),
        ...(active !== undefined ? { active } : {}),
        ...(warehouseId ? { warehouseId } : {}),
        ...(usage ? { usage: usage as any } : {}),
        ...(effectiveCompanyId ? { companyId: effectiveCompanyId } : {}),
      };
    } else {
      where = {};
      if (active !== undefined) where.active = active;
      if (warehouseId) where.warehouseId = warehouseId;
      if (usage) where.usage = usage as any;
      if (effectiveCompanyId) where.companyId = effectiveCompanyId;
    }

    const [data, total] = await this.repo.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: { name: 'ASC' },
      relations: ['parent', 'warehouse'],
    });
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string, companyId?: string) {
    const where: any = { id };
    if (companyId) where.companyId = companyId;
    const entity = await this.repo.findOne({
      where,
      relations: ['parent', 'children', 'warehouse'],
    });
    if (!entity) throw new NotFoundException(`Location ${id} not found`);
    return entity;
  }

  async update(id: string, dto: UpdateLocationDto, companyId?: string) {
    const entity = await this.findOne(id, companyId);
    if (dto.parentId === id) {
      throw new BadRequestException('A location cannot be its own parent');
    }
    Object.assign(entity, dto);
    entity.completeName = await this.computeCompleteName(
      entity.name,
      entity.parentId,
    );
    return this.repo.save(entity);
  }

  async remove(id: string, companyId?: string) {
    const entity = await this.findOne(id, companyId);
    entity.active = false;
    await this.repo.save(entity);
  }
}
