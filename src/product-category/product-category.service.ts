import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { ProductCategory } from './entities/product-category.entity';
import { CreateProductCategoryDto } from './dto/create-product-category.dto';
import { UpdateProductCategoryDto } from './dto/update-product-category.dto';
import {
  Paginated,
  PaginationQueryDto,
} from '../common/dto/pagination-query.dto';

@Injectable()
export class ProductCategoryService {
  constructor(
    @InjectRepository(ProductCategory)
    private readonly repo: Repository<ProductCategory>,
  ) {}

  private async computeCompleteName(name: string, parentId?: string) {
    if (!parentId) return name;
    const parent = await this.repo.findOne({ where: { id: parentId } });
    if (!parent) throw new BadRequestException('Parent category not found');
    return `${parent.completeName ?? parent.name} / ${name}`;
  }

  async create(dto: CreateProductCategoryDto, companyId?: string) {
    const completeName = await this.computeCompleteName(dto.name, dto.parentId);
    const entity = this.repo.create({ ...dto, completeName, companyId: companyId || (dto as any).companyId });
    return this.repo.save(entity);
  }

  async findAll(
    query: PaginationQueryDto & { parentId?: string; companyId?: string },
    companyId?: string,
  ): Promise<Paginated<ProductCategory>> {
    const page = Number(query.page) > 0 ? Number(query.page) : 1;
    const limit = Number(query.limit) > 0 ? Number(query.limit) : 20;
    const { search, active, parentId } = query;
    const effectiveCompanyId = companyId || query?.companyId;

    const where: any = {};
    if (search) where.name = ILike(`%${search}%`);
    if (active !== undefined) where.active = active;
    if (parentId !== undefined) where.parentId = parentId;
    if (effectiveCompanyId) {
      where.companyId = effectiveCompanyId;
    }

    const [data, total] = await this.repo.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: { name: 'ASC' },
      relations: ['parent'],
    });
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string, companyId?: string) {
    const where: any = { id };
    if (companyId) where.companyId = companyId;
    const entity = await this.repo.findOne({ where, relations: ['parent', 'children'] });
    if (!entity) throw new NotFoundException(`Product Category ${id} not found`);
    return entity;
  }

  async update(id: string, dto: UpdateProductCategoryDto, companyId?: string) {
    const entity = await this.findOne(id, companyId);
    if (dto.parentId === id) {
      throw new BadRequestException('A category cannot be its own parent');
    }
    Object.assign(entity, dto);
    entity.completeName = await this.computeCompleteName(entity.name, entity.parentId);
    return this.repo.save(entity);
  }

  async remove(id: string, companyId?: string) {
    const entity = await this.findOne(id, companyId);
    entity.active = false;
    await this.repo.save(entity);
  }
}
