import {
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Paginated } from "../common/dto/pagination-query.dto";
import { AccountGroup } from "./entities/account-group.entity";
import { CreateAccountGroupDto } from "./dto/create-account-group.dto";
import { UpdateAccountGroupDto } from "./dto/update-account-group.dto";
import { AccountGroupQueryDto } from "./dto/account-group-query.dto";
import { AccountTypeEntity } from "../account-types/entities/account-type.entity";

@Injectable()
export class AccountGroupsService implements OnModuleInit {
  constructor(
    @InjectRepository(AccountGroup)
    private readonly repo: Repository<AccountGroup>,
    @InjectRepository(AccountTypeEntity)
    private readonly typeRepo: Repository<AccountTypeEntity>,
  ) {}

  async onModuleInit() {
    try {
      await this.repo.query(`
        ALTER TABLE "account_groups" ADD COLUMN IF NOT EXISTS "company_id" uuid;
      `);
    } catch {
      // Ignore if table does not exist
    }
  }

  async create(dto: CreateAccountGroupDto, companyId?: string): Promise<AccountGroup> {
    const effectiveCompanyId = companyId || dto.companyId;
    const exists = await this.repo.findOne({
      where: effectiveCompanyId
        ? { name: dto.name, codePrefix: dto.codePrefix, companyId: effectiveCompanyId }
        : { name: dto.name, codePrefix: dto.codePrefix },
    });
    if (exists) {
      throw new ConflictException(
        `Account Group with name "${dto.name}" and prefix "${dto.codePrefix}" already exists for this company`,
      );
    }
    const entity = this.repo.create({
      ...dto,
      parentId: dto.parentId || null,
      accountTypeId: dto.accountTypeId || null,
      companyId: effectiveCompanyId,
    });
    const saved = await this.repo.save(entity);
    return this.findOne(saved.id, effectiveCompanyId);
  }

  async findAll(query: AccountGroupQueryDto, companyId?: string): Promise<Paginated<AccountGroup>> {
    const { page = 1, limit = 50, search, codePrefix, accountTypeId, active = true } =
      query;
    let effectiveCompanyId = companyId || query?.companyId;
    if (!effectiveCompanyId) {
      const defaultComp = await this.repo.manager.query(
        `SELECT id FROM companies ORDER BY created_at DESC LIMIT 1`,
      );
      if (defaultComp && defaultComp[0]?.id) {
        effectiveCompanyId = defaultComp[0].id;
      }
    }

    const qb = this.repo
      .createQueryBuilder("group")
      .leftJoinAndSelect("group.accountType", "accountType")
      .leftJoinAndSelect("group.parent", "parent");

    if (active !== undefined) {
      qb.andWhere("group.active = :active", { active });
    }
    if (codePrefix) {
      qb.andWhere("group.codePrefix = :codePrefix", { codePrefix });
    }
    if (accountTypeId) {
      qb.andWhere("group.accountTypeId = :accountTypeId", { accountTypeId });
    }
    if (effectiveCompanyId) {
      qb.andWhere("group.companyId = :companyId", { companyId: effectiveCompanyId });
    }
    if (search) {
      qb.andWhere(
        "(LOWER(group.name) LIKE LOWER(:search) OR LOWER(group.codePrefix) LIKE LOWER(:search))",
        { search: `%${search}%` },
      );
    }

    qb.orderBy("group.codePrefix", "ASC")
      .addOrderBy("group.name", "ASC")
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

  async findOne(id: string, companyId?: string): Promise<AccountGroup> {
    const where: any = { id };
    if (companyId) where.companyId = companyId;
    const group = await this.repo.findOne({
      where,
      relations: ["accountType", "parent"],
    });
    if (!group) {
      throw new NotFoundException(`Account Group with id "${id}" not found`);
    }
    return group;
  }

  async update(
    id: string,
    dto: UpdateAccountGroupDto,
    companyId?: string,
  ): Promise<AccountGroup> {
    const group = await this.findOne(id, companyId);
    if (dto.parentId && dto.parentId === id) {
      throw new ConflictException("An account group cannot be its own parent");
    }
    Object.assign(group, dto);
    if (dto.parentId !== undefined) {
      const newParentId = dto.parentId || null;
      group.parentId = newParentId as any;
      group.parent = newParentId ? ({ id: newParentId } as any) : null;
    }
    if (dto.accountTypeId !== undefined) {
      const newTypeId = dto.accountTypeId || null;
      group.accountTypeId = newTypeId as any;
      group.accountType = newTypeId ? ({ id: newTypeId } as any) : null;
    }
    const saved = await this.repo.save(group);
    return this.findOne(saved.id, companyId);
  }

  async remove(id: string, companyId?: string): Promise<void> {
    const group = await this.findOne(id, companyId);
    group.active = false;
    await this.repo.save(group);
  }

  async seedDefaults(): Promise<AccountGroup[]> {
    const types = await this.typeRepo.find();
    const typeMap = new Map<string, string>();
    types.forEach((t) => typeMap.set(t.name, t.id));

    const defaultGroups = [
      {
        name: "Current Assets",
        codePrefix: "10",
        accountTypeName: "Current Assets",
      },
      {
        name: "Bank & Cash",
        codePrefix: "101",
        accountTypeName: "Bank and Cash",
      },
      {
        name: "Trade Receivables",
        codePrefix: "11",
        accountTypeName: "Receivable",
      },
      {
        name: "Prepayments & Advances",
        codePrefix: "12",
        accountTypeName: "Prepayments",
      },
      {
        name: "Fixed Assets",
        codePrefix: "15",
        accountTypeName: "Fixed Assets",
      },
      {
        name: "Current Liabilities",
        codePrefix: "20",
        accountTypeName: "Current Liabilities",
      },
      {
        name: "Trade Payables",
        codePrefix: "21",
        accountTypeName: "Payable",
      },
      {
        name: "Equity & Reserves",
        codePrefix: "30",
        accountTypeName: "Equity",
      },
      {
        name: "Operating Income",
        codePrefix: "40",
        accountTypeName: "Income / Revenue",
      },
      {
        name: "Cost of Goods Sold",
        codePrefix: "50",
        accountTypeName: "Cost of Revenue / Goods Sold",
      },
      {
        name: "Operating Expenses",
        codePrefix: "51",
        accountTypeName: "Expenses",
      },
    ];

    const results: AccountGroup[] = [];
    for (const dg of defaultGroups) {
      let existing = await this.repo.findOne({
        where: { name: dg.name, codePrefix: dg.codePrefix },
      });
      if (!existing) {
        const accountTypeId = dg.accountTypeName
          ? typeMap.get(dg.accountTypeName)
          : undefined;
        existing = await this.repo.save(
          this.repo.create({
            name: dg.name,
            codePrefix: dg.codePrefix,
            accountTypeId,
          }),
        );
      }
      results.push(existing);
    }
    return results;
  }
}

