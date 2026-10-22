import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ILike, Repository } from "typeorm";
import {
  Paginated,
} from "../common/dto/pagination-query.dto";
import { AccountJournalQueryDto } from "./dto/account-journal-query.dto";
import { CreateAccountJournalDto } from "./dto/create-account-journal.dto";
import { UpdateAccountJournalDto } from "./dto/update-account-journal.dto";
import { AccountJournal } from "./entities/account-journal.entity";

@Injectable()
export class AccountJournalsService {
  constructor(
    @InjectRepository(AccountJournal)
    private readonly repo: Repository<AccountJournal>,
  ) {}

  async create(dto: CreateAccountJournalDto): Promise<AccountJournal> {
    const exists = await this.repo.findOne({ where: { code: dto.code } });
    if (exists) {
      throw new ConflictException(
        `Journal with code "${dto.code}" already exists`,
      );
    }
    return this.repo.save(this.repo.create(dto));
  }

  async findAll(query: AccountJournalQueryDto): Promise<Paginated<AccountJournal>> {
    const { page, limit, search, type, active } = query;
    const queryBuilder = this.repo.createQueryBuilder("journal");

    if (active !== undefined) {
      queryBuilder.andWhere("journal.active = :active", { active });
    }
    if (type) {
      queryBuilder.andWhere("journal.type = :type", { type });
    }
    if (search) {
      queryBuilder.andWhere(
        "(journal.name ILIKE :search OR journal.code ILIKE :search)",
        { search: `%${search}%` },
      );
    }

    queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy("journal.name", "ASC");

    const [data, total] = await queryBuilder.getManyAndCount();
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string): Promise<AccountJournal> {
    const journal = await this.repo.findOne({ where: { id } });
    if (!journal) throw new NotFoundException(`Journal ${id} not found`);
    return journal;
  }

  async update(
    id: string,
    dto: UpdateAccountJournalDto,
  ): Promise<AccountJournal> {
    const journal = await this.findOne(id);
    if (dto.code && dto.code !== journal.code) {
      const exists = await this.repo.findOne({ where: { code: dto.code } });
      if (exists) {
        throw new ConflictException(
          `Journal with code "${dto.code}" already exists`,
        );
      }
    }
    Object.assign(journal, dto);
    return this.repo.save(journal);
  }

  async remove(id: string): Promise<void> {
    const journal = await this.findOne(id);
    journal.active = false;
    await this.repo.save(journal);
  }
}
