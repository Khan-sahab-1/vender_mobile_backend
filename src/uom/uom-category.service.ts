import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { UomCategory } from './entities/uom-category.entity';
import { CreateUomCategoryDto } from './dto/create-uom-category.dto';
import { UpdateUomCategoryDto } from './dto/update-uom-category.dto';
import {
  Paginated,
  PaginationQueryDto,
} from '../common/dto/pagination-query.dto';

@Injectable()
export class UomCategoryService implements OnModuleInit {
  constructor(
    @InjectRepository(UomCategory)
    private readonly repo: Repository<UomCategory>,
  ) {}

  async onModuleInit() {
    try {
      // Safely drop any legacy single-column unique constraint on name in uom_categories
      await this.repo.query(`
        DO $$
        DECLARE
            r RECORD;
        BEGIN
            FOR r IN (
                SELECT conname
                FROM pg_constraint c
                JOIN pg_class t ON c.conrelid = t.oid
                JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey)
                WHERE t.relname = 'uom_categories' AND c.contype = 'u'
                GROUP BY c.conname, c.conkey
                HAVING count(*) = 1 AND bool_or(a.attname = 'name')
            ) LOOP
                EXECUTE 'ALTER TABLE "uom_categories" DROP CONSTRAINT IF EXISTS "' || r.conname || '" CASCADE';
            END LOOP;
        END $$;
      `);
      await this.repo.query(`
        ALTER TABLE "uom_categories" ADD COLUMN IF NOT EXISTS "company_id" uuid;
      `);
    } catch {
      // Ignore if table doesn't exist yet
    }
  }

  create(dto: CreateUomCategoryDto, companyId?: string) {
    const effectiveCompanyId = companyId || dto.companyId;
    return this.repo.save(this.repo.create({ ...dto, companyId: effectiveCompanyId }));
  }

  async findAll(
    query: PaginationQueryDto & { companyId?: string },
    companyId?: string,
  ): Promise<Paginated<UomCategory>> {
    const page = Number(query?.page) > 0 ? Number(query.page) : 1;
    const limit = Number(query?.limit) > 0 ? Number(query.limit) : 20;
    const { search, active } = query || {};
    const effectiveCompanyId = companyId || query?.companyId;

    let where: any;
    if (search) {
      where = {
        name: ILike(`%${search}%`),
        ...(active !== undefined ? { active } : {}),
        ...(effectiveCompanyId ? { companyId: effectiveCompanyId } : {}),
      };
    } else {
      where = {};
      if (active !== undefined) where.active = active;
      if (effectiveCompanyId) where.companyId = effectiveCompanyId;
    }

    const [data, total] = await this.repo.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: { name: 'ASC' },
      relations: ['uoms'],
    });
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string, companyId?: string) {
    const where: any = { id };
    if (companyId) where.companyId = companyId;
    const entity = await this.repo.findOne({ where, relations: ['uoms'] });
    if (!entity) throw new NotFoundException(`UoM Category ${id} not found`);
    return entity;
  }

  async update(id: string, dto: UpdateUomCategoryDto, companyId?: string) {
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
