import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Tax } from './entities/tax.entity';
import { CreateTaxDto } from './dto/create-tax.dto';
import { UpdateTaxDto } from './dto/update-tax.dto';
import {
  Paginated,
  PaginationQueryDto,
} from '../common/dto/pagination-query.dto';

@Injectable()
export class TaxesService {
  constructor(
    @InjectRepository(Tax) private readonly repo: Repository<Tax>,
  ) {}

  create(dto: CreateTaxDto) {
    return this.repo.save(this.repo.create(dto));
  }

  async findAll(
    query: PaginationQueryDto & { typeTaxUse?: string },
  ): Promise<Paginated<Tax>> {
    const { page, limit, search, active, typeTaxUse } = query;
    const where: any = {};
    if (search) where.name = ILike(`%${search}%`);
    if (active !== undefined) where.active = active;
    if (typeTaxUse) where.typeTaxUse = typeTaxUse;

    const [data, total] = await this.repo.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: { sequence: 'ASC', name: 'ASC' },
    });
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException(`Tax ${id} not found`);
    return entity;
  }

  async update(id: string, dto: UpdateTaxDto) {
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
