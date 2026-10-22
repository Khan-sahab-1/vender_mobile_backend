import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ILike, Repository } from "typeorm";
import { Division } from "./entities/division.entity";
import { CreateDivisionDto } from "./dto/create-division.dto";
import { UpdateDivisionDto } from "./dto/update-division.dto";
import {
  Paginated,
  PaginationQueryDto,
} from "../common/dto/pagination-query.dto";

@Injectable()
export class DivisionsService {
  constructor(
    @InjectRepository(Division)
    private readonly repo: Repository<Division>,
  ) {}

  async create(dto: CreateDivisionDto): Promise<Division> {
    const exists = await this.repo.findOne({ where: { code: dto.code } });
    if (exists) {
      throw new ConflictException(
        `Division with code "${dto.code}" already exists`,
      );
    }
    return this.repo.save(this.repo.create(dto));
  }

  async findAll(query: PaginationQueryDto): Promise<Paginated<Division>> {
    const { page, limit, search, active } = query;
    let where: any = {};
    if (search) {
      where = [
        {
          name: ILike(`%${search}%`),
          ...(active !== undefined ? { active } : {}),
        },
        {
          code: ILike(`%${search}%`),
          ...(active !== undefined ? { active } : {}),
        },
      ];
    } else if (active !== undefined) {
      where = { active };
    }

    const [data, total] = await this.repo.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: { name: "ASC" },
    });
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string): Promise<Division> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException(`Division ${id} not found`);
    return entity;
  }

  async update(id: string, dto: UpdateDivisionDto): Promise<Division> {
    const entity = await this.findOne(id);
    if (dto.code && dto.code !== entity.code) {
      const exists = await this.repo.findOne({ where: { code: dto.code } });
      if (exists) {
        throw new ConflictException(
          `Division with code "${dto.code}" already exists`,
        );
      }
    }
    Object.assign(entity, dto);
    return this.repo.save(entity);
  }

  async remove(id: string): Promise<void> {
    const entity = await this.findOne(id);
    entity.active = false;
    await this.repo.save(entity);
  }
}

