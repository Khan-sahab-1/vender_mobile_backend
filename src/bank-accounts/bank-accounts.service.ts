import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Paginated } from "../common/dto/pagination-query.dto";
import { BankAccount } from "./entities/bank-account.entity";
import { CreateBankAccountDto } from "./dto/create-bank-account.dto";
import { UpdateBankAccountDto } from "./dto/update-bank-account.dto";
import { BankAccountQueryDto } from "./dto/bank-account-query.dto";
import { AccountJournal } from "../account-journals/entities/account-journal.entity";
import { AccountJournalType } from "../account-journals/enums/account-journal.enum";

@Injectable()
export class BankAccountsService {
  constructor(
    @InjectRepository(BankAccount)
    private readonly repo: Repository<BankAccount>,
    @InjectRepository(AccountJournal)
    private readonly journalRepo: Repository<AccountJournal>,
  ) {}

  async create(dto: CreateBankAccountDto): Promise<BankAccount> {
    const existing = await this.repo.findOne({
      where: { accountNumber: dto.accountNumber, active: true },
    });
    if (existing) {
      throw new ConflictException(
        `Bank Account with account number "${dto.accountNumber}" already exists`,
      );
    }

    // Auto-create / sync with an Accounting Journal of type BANK
    let journal = await this.journalRepo.findOne({
      where: { code: dto.shortCode },
    });
    if (!journal) {
      journal = await this.journalRepo.save(
        this.journalRepo.create({
          name: dto.name,
          code: dto.shortCode,
          type: AccountJournalType.BANK,
        }),
      );
    }

    const entity = this.repo.create({
      ...dto,
      journalId: journal.id,
      receivable: dto.receivable ?? true,
      payable: dto.payable ?? true,
      currency: dto.currency || "INR",
    });

    return this.repo.save(entity);
  }

  async findAll(query: BankAccountQueryDto): Promise<Paginated<BankAccount>> {
    const {
      page = 1,
      limit = 50,
      search,
      receivable,
      payable,
      active = true,
    } = query;

    const qb = this.repo.createQueryBuilder("ba");

    if (active !== undefined) {
      qb.andWhere("ba.active = :active", { active });
    }
    if (receivable !== undefined) {
      qb.andWhere("ba.receivable = :receivable", { receivable });
    }
    if (payable !== undefined) {
      qb.andWhere("ba.payable = :payable", { payable });
    }
    if (search) {
      qb.andWhere(
        "(LOWER(ba.name) LIKE LOWER(:search) OR LOWER(ba.bankName) LIKE LOWER(:search) OR LOWER(ba.accountNumber) LIKE LOWER(:search) OR LOWER(ba.shortCode) LIKE LOWER(:search))",
        { search: `%${search}%` },
      );
    }

    qb.orderBy("ba.createdAt", "DESC")
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();
    return {
      data: items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<BankAccount> {
    const account = await this.repo.findOne({ where: { id } });
    if (!account) {
      throw new NotFoundException(`Bank Account with ID "${id}" not found`);
    }
    return account;
  }

  async update(id: string, dto: UpdateBankAccountDto): Promise<BankAccount> {
    const account = await this.findOne(id);

    if (dto.accountNumber && dto.accountNumber !== account.accountNumber) {
      const existing = await this.repo.findOne({
        where: { accountNumber: dto.accountNumber, active: true },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(
          `Bank Account with account number "${dto.accountNumber}" already exists`,
        );
      }
    }

    // Sync journal if code or name changed
    if (account.journalId && (dto.name || dto.shortCode)) {
      const journal = await this.journalRepo.findOne({
        where: { id: account.journalId },
      });
      if (journal) {
        if (dto.name) journal.name = dto.name;
        if (dto.shortCode) journal.code = dto.shortCode;
        await this.journalRepo.save(journal);
      }
    }

    Object.assign(account, dto);
    return this.repo.save(account);
  }

  async remove(id: string): Promise<void> {
    const account = await this.findOne(id);
    account.active = false;
    await this.repo.save(account);
  }
}
