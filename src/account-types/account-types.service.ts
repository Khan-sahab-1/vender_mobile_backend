import {
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Paginated } from "../common/dto/pagination-query.dto";
import {
  AccountInternalGroup,
  AccountTypeCategory,
} from "./enums/account-type-category.enum";
import { AccountTypeEntity } from "./entities/account-type.entity";
import { CreateAccountTypeDto } from "./dto/create-account-type.dto";
import { UpdateAccountTypeDto } from "./dto/update-account-type.dto";
import { AccountTypeQueryDto } from "./dto/account-type-query.dto";

@Injectable()
export class AccountTypesService implements OnModuleInit {
  constructor(
    @InjectRepository(AccountTypeEntity)
    private readonly repo: Repository<AccountTypeEntity>,
  ) {}

  async onModuleInit() {
    try {
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
                WHERE t.relname = 'account_types' AND c.contype = 'u'
                GROUP BY c.conname, c.conkey
                HAVING count(*) = 1 AND bool_or(a.attname = 'name')
            ) LOOP
                EXECUTE 'ALTER TABLE "account_types" DROP CONSTRAINT IF EXISTS "' || r.conname || '" CASCADE';
            END LOOP;
        END $$;
      `);
      await this.repo.query(`
        ALTER TABLE "account_types" ADD COLUMN IF NOT EXISTS "company_id" uuid;
      `);
    } catch {
      // Ignore if table does not exist
    }
  }

  async create(dto: CreateAccountTypeDto, companyId?: string): Promise<AccountTypeEntity> {
    const effectiveCompanyId = companyId || dto.companyId;
    const exists = await this.repo.findOne({
      where: effectiveCompanyId ? { name: dto.name, companyId: effectiveCompanyId } : { name: dto.name },
    });
    if (exists) {
      throw new ConflictException(
        `Account Type with name "${dto.name}" already exists for this company`,
      );
    }
    if (!dto.internalGroup) {
      dto.internalGroup =
        dto.type === AccountTypeCategory.PAYABLE
          ? AccountInternalGroup.LIABILITY
          : AccountInternalGroup.ASSET;
    }
    if (dto.includeInitialBalance === undefined) {
      dto.includeInitialBalance = true;
    }
    const entity = this.repo.create({ ...dto, companyId: effectiveCompanyId });
    return this.repo.save(entity);
  }

  async findAll(query: AccountTypeQueryDto, companyId?: string): Promise<Paginated<AccountTypeEntity>> {
    const {
      page = 1,
      limit = 50,
      search,
      type,
      internalGroup,
      active = true,
    } = query;
    let effectiveCompanyId = companyId || query?.companyId;
    if (!effectiveCompanyId) {
      const defaultComp = await this.repo.manager.query(
        `SELECT id FROM companies ORDER BY created_at DESC LIMIT 1`,
      );
      if (defaultComp && defaultComp[0]?.id) {
        effectiveCompanyId = defaultComp[0].id;
      }
    }

    const qb = this.repo.createQueryBuilder("accountType");

    if (active !== undefined) {
      qb.andWhere("accountType.active = :active", { active });
    }
    if (type) {
      qb.andWhere("accountType.type = :type", { type });
    }
    if (internalGroup) {
      qb.andWhere("accountType.internalGroup = :internalGroup", {
        internalGroup,
      });
    }
    if (effectiveCompanyId) {
      qb.andWhere("accountType.companyId = :companyId", { companyId: effectiveCompanyId });
    }
    if (search) {
      qb.andWhere(
        "(LOWER(accountType.name) LIKE LOWER(:search) OR LOWER(accountType.notes) LIKE LOWER(:search))",
        { search: `%${search}%` },
      );
    }

    qb.orderBy("accountType.name", "ASC")
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, companyId?: string): Promise<AccountTypeEntity> {
    const where: any = { id };
    if (companyId) where.companyId = companyId;
    const record = await this.repo.findOne({ where });
    if (!record) {
      throw new NotFoundException(`Account Type with id "${id}" not found`);
    }
    return record;
  }

  async update(
    id: string,
    dto: UpdateAccountTypeDto,
    companyId?: string,
  ): Promise<AccountTypeEntity> {
    const record = await this.findOne(id, companyId);
    if (dto.name && dto.name !== record.name) {
      const effectiveCompanyId = companyId || record.companyId;
      const exists = await this.repo.findOne({
        where: effectiveCompanyId ? { name: dto.name, companyId: effectiveCompanyId } : { name: dto.name },
      });
      if (exists && exists.id !== id) {
        throw new ConflictException(
          `Account Type with name "${dto.name}" already exists for this company`,
        );
      }
    }
    Object.assign(record, dto);
    return this.repo.save(record);
  }

  async remove(id: string, companyId?: string): Promise<void> {
    const record = await this.findOne(id, companyId);
    record.active = false;
    await this.repo.save(record);
  }

  async seedDefaults(): Promise<AccountTypeEntity[]> {
    const defaultTypes: Partial<AccountTypeEntity>[] = [
      {
        name: "Receivable",
        type: AccountTypeCategory.RECEIVABLE,
        internalGroup: AccountInternalGroup.ASSET,
        includeInitialBalance: true,
        notes: "Trade receivables / debtors (customer invoices)",
      },
      {
        name: "Bank and Cash",
        type: AccountTypeCategory.LIQUIDITY,
        internalGroup: AccountInternalGroup.ASSET,
        includeInitialBalance: true,
        notes: "Bank accounts and petty cash funds",
      },
      {
        name: "Current Assets",
        type: AccountTypeCategory.REGULAR,
        internalGroup: AccountInternalGroup.ASSET,
        includeInitialBalance: true,
        notes: "Short-term assets (stock, inventory, prepaid expenses)",
      },
      {
        name: "Non-current Assets",
        type: AccountTypeCategory.REGULAR,
        internalGroup: AccountInternalGroup.ASSET,
        includeInitialBalance: true,
        notes: "Long term investments and tangible resources",
      },
      {
        name: "Prepayments",
        type: AccountTypeCategory.REGULAR,
        internalGroup: AccountInternalGroup.ASSET,
        includeInitialBalance: true,
        notes: "Prepaid expenses and advance tax credits",
      },
      {
        name: "Fixed Assets",
        type: AccountTypeCategory.REGULAR,
        internalGroup: AccountInternalGroup.ASSET,
        includeInitialBalance: true,
        notes: "Plant, machinery, furniture, computers and vehicles",
      },
      {
        name: "Payable",
        type: AccountTypeCategory.PAYABLE,
        internalGroup: AccountInternalGroup.LIABILITY,
        includeInitialBalance: true,
        notes: "Trade payables / creditors (supplier bills)",
      },
      {
        name: "Credit Card",
        type: AccountTypeCategory.LIQUIDITY,
        internalGroup: AccountInternalGroup.LIABILITY,
        includeInitialBalance: true,
        notes: "Corporate credit cards and lines of credit",
      },
      {
        name: "Current Liabilities",
        type: AccountTypeCategory.REGULAR,
        internalGroup: AccountInternalGroup.LIABILITY,
        includeInitialBalance: true,
        notes: "Duties, taxes payable, short term borrowings",
      },
      {
        name: "Non-current Liabilities",
        type: AccountTypeCategory.REGULAR,
        internalGroup: AccountInternalGroup.LIABILITY,
        includeInitialBalance: true,
        notes: "Long-term bank loans and debentures",
      },
      {
        name: "Equity",
        type: AccountTypeCategory.REGULAR,
        internalGroup: AccountInternalGroup.EQUITY,
        includeInitialBalance: true,
        notes: "Capital, retained earnings, shareholder equity",
      },
      {
        name: "Income / Revenue",
        type: AccountTypeCategory.REGULAR,
        internalGroup: AccountInternalGroup.INCOME,
        includeInitialBalance: false,
        notes: "Sales revenue and operating turnover",
      },
      {
        name: "Other Income",
        type: AccountTypeCategory.REGULAR,
        internalGroup: AccountInternalGroup.INCOME,
        includeInitialBalance: false,
        notes: "Interest received, forex gains, discounts",
      },
      {
        name: "Expenses",
        type: AccountTypeCategory.REGULAR,
        internalGroup: AccountInternalGroup.EXPENSE,
        includeInitialBalance: false,
        notes: "Operational expenses, rent, utilities, salaries",
      },
      {
        name: "Cost of Revenue / Goods Sold",
        type: AccountTypeCategory.REGULAR,
        internalGroup: AccountInternalGroup.EXPENSE,
        includeInitialBalance: false,
        notes: "Direct material costs, freight, customs, COGS",
      },
    ];

    const results: AccountTypeEntity[] = [];
    for (const dt of defaultTypes) {
      let existing = await this.repo.findOne({ where: { name: dt.name } });
      if (!existing) {
        existing = await this.repo.save(this.repo.create(dt));
      }
      results.push(existing);
    }
    return results;
  }
}

