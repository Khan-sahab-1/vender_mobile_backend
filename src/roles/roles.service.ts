import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Role } from './entities/role.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import {
  Paginated,
  PaginationQueryDto,
} from '../common/dto/pagination-query.dto';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role) private readonly repo: Repository<Role>,
  ) {}

  async create(dto: CreateRoleDto): Promise<Role> {
    const exists = await this.repo.findOne({ where: { name: dto.name } });
    if (exists) throw new ConflictException(`Role "${dto.name}" already exists`);
    return this.repo.save(this.repo.create(dto));
  }

  async findAll(query: PaginationQueryDto): Promise<Paginated<Role>> {
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

  async findOne(id: string): Promise<Role> {
    const role = await this.repo.findOne({ where: { id } });
    if (!role) throw new NotFoundException(`Role ${id} not found`);
    return role;
  }

  async update(id: string, dto: UpdateRoleDto): Promise<Role> {
    const role = await this.findOne(id);
    Object.assign(role, dto);
    return this.repo.save(role);
  }

  async remove(id: string): Promise<void> {
    const role = await this.findOne(id);
    role.active = false;
    await this.repo.save(role);
  }
}
