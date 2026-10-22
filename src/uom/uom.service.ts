import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Uom } from './entities/uom.entity';
import { CreateUomDto } from './dto/create-uom.dto';
import { UpdateUomDto } from './dto/update-uom.dto';
import {
  Paginated,
  PaginationQueryDto,
} from '../common/dto/pagination-query.dto';

@Injectable()
export class UomService implements OnModuleInit {
  constructor(
    @InjectRepository(Uom) private readonly repo: Repository<Uom>,
  ) {}

  async onModuleInit() {
    try {
      await this.repo.query(`
        ALTER TABLE "uoms" ADD COLUMN IF NOT EXISTS "company_id" uuid;
      `);
    } catch {
      // Ignore if table doesn't exist yet
    }
  }

  create(dto: CreateUomDto, companyId?: string) {
    const effectiveCompanyId = companyId || dto.companyId;
    return this.repo.save(this.repo.create({ ...dto, companyId: effectiveCompanyId }));
  }

  async findAll(
    query: PaginationQueryDto & { categoryId?: string; companyId?: string },
    companyId?: string,
  ): Promise<Paginated<Uom>> {
    const page = Number(query?.page) > 0 ? Number(query.page) : 1;
    const limit = Number(query?.limit) > 0 ? Number(query.limit) : 20;
    const { search, active, categoryId } = query || {};
    const effectiveCompanyId = companyId || query?.companyId;

    let where: any;
    if (search) {
      where = {
        name: ILike(`%${search}%`),
        ...(active !== undefined ? { active } : {}),
        ...(categoryId ? { categoryId } : {}),
        ...(effectiveCompanyId ? { companyId: effectiveCompanyId } : {}),
      };
    } else {
      where = {};
      if (active !== undefined) where.active = active;
      if (categoryId) where.categoryId = categoryId;
      if (effectiveCompanyId) where.companyId = effectiveCompanyId;
    }

    const [data, total] = await this.repo.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: { name: 'ASC' },
      relations: ['category'],
    });
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string, companyId?: string) {
    const where: any = { id };
    if (companyId) where.companyId = companyId;
    const entity = await this.repo.findOne({ where, relations: ['category'] });
    if (!entity) throw new NotFoundException(`UoM ${id} not found`);
    return entity;
  }

  async update(id: string, dto: UpdateUomDto, companyId?: string) {
    const entity = await this.findOne(id, companyId);
    Object.assign(entity, dto);
    return this.repo.save(entity);
  }

  async remove(id: string, companyId?: string) {
    const entity = await this.findOne(id, companyId);
    entity.active = false;
    await this.repo.save(entity);
  }
}
