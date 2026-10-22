import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AccountAccountQueryDto } from "./dto/account-account-query.dto";
import { CreateAccountAccountDto } from "./dto/create-account-account.dto";
import { UpdateAccountAccountDto } from "./dto/update-account-account.dto";
import { AccountAccount } from "./entities/account-account.entity";
import { AccountType } from "./enums/account-account.enum";
import { AccountTypeEntity } from "../account-types/entities/account-type.entity";
import { AccountGroup } from "../account-groups/entities/account-group.entity";
import { AccountTypeCategory } from "../account-types/enums/account-type-category.enum";

@Injectable()
export class AccountAccountsService implements OnModuleInit {
  constructor(
    @InjectRepository(AccountAccount)
    private readonly repo: Repository<AccountAccount>,
    @InjectRepository(AccountTypeEntity)
    private readonly accountTypeRepo: Repository<AccountTypeEntity>,
    @InjectRepository(AccountGroup)
    private readonly accountGroupRepo: Repository<AccountGroup>,
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
                WHERE t.relname = 'account_accounts' AND c.contype = 'u'
                GROUP BY c.conname, c.conkey
                HAVING count(*) = 1 AND bool_or(a.attname = 'code')
            ) LOOP
                EXECUTE 'ALTER TABLE "account_accounts" DROP CONSTRAINT IF EXISTS "' || r.conname || '" CASCADE';
            END LOOP;
        END $$;
      `);
      await this.repo.query(`
        ALTER TABLE "account_accounts" ADD COLUMN IF NOT EXISTS "company_id" uuid;
      `);
      await this.repo.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS uq_account_accounts_code_company ON account_accounts (code, company_id);
      `);
    } catch {
      // Ignore if table does not exist
    }
  }

  async create(dto: CreateAccountAccountDto, companyId?: string): Promise<AccountAccount> {
    const effectiveCompanyId = companyId || dto.companyId;
    const existing = await this.repo.findOne({
      where: effectiveCompanyId ? { code: dto.code, companyId: effectiveCompanyId } : { code: dto.code },
    });
    if (existing) {
      throw new BadRequestException(
        `Account with code '${dto.code}' already exists for this company`,
      );
    }

    let accountType = dto.accountTypeId
      ? await this.accountTypeRepo.findOne({ where: { id: dto.accountTypeId } })
      : null;

    if (dto.accountTypeId && !accountType) {
      throw new BadRequestException(
        `Account Type with ID '${dto.accountTypeId}' not found`,
      );
    }

    if (dto.groupId) {
      const group = await this.accountGroupRepo.findOne({
        where: { id: dto.groupId },
      });
      if (!group) {
        throw new BadRequestException(
          `Account Group with ID '${dto.groupId}' not found`,
        );
      }
      if (!dto.accountTypeId && group.accountTypeId) {
        dto.accountTypeId = group.accountTypeId;
        accountType = await this.accountTypeRepo.findOne({
          where: { id: group.accountTypeId },
        });
      }
    }

    // Auto-derive internal AccountType if not explicitly passed
    let derivedType = dto.type;
    if (!derivedType && accountType) {
      if (accountType.type === AccountTypeCategory.LIQUIDITY) {
        derivedType = AccountType.BANK;
      } else if (accountType.type === AccountTypeCategory.RECEIVABLE) {
        derivedType = AccountType.RECEIVABLE;
      } else if (accountType.type === AccountTypeCategory.PAYABLE) {
        derivedType = AccountType.PAYABLE;
      } else {
        derivedType = AccountType.EXPENSE;
      }
    }

    const account = this.repo.create({
      ...dto,
      companyId: effectiveCompanyId,
      type: derivedType || AccountType.EXPENSE,
    });
    return this.repo.save(account);
  }

  async findAll(query: AccountAccountQueryDto, companyId?: string) {
    const {
      page = 1,
      limit = 50,
      search,
      code,
      type,
      accountTypeId,
      groupId,
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

    const qb = this.repo
      .createQueryBuilder("account")
      .leftJoinAndSelect("account.accountType", "accountType")
      .leftJoinAndSelect("account.group", "group");

    if (active !== undefined) {
      qb.andWhere("account.active = :active", { active });
    }

    if (code) {
      qb.andWhere("account.code = :code", { code });
    }

    if (type) {
      qb.andWhere("account.type = :type", { type });
    }

    if (accountTypeId) {
      qb.andWhere("account.accountTypeId = :accountTypeId", { accountTypeId });
    }

    if (groupId) {
      qb.andWhere("account.groupId = :groupId", { groupId });
    }

    if (effectiveCompanyId) {
      qb.andWhere("account.companyId = :companyId", { companyId: effectiveCompanyId });
    }

    if (search) {
      qb.andWhere(
        "(LOWER(account.name) LIKE LOWER(:search) OR LOWER(account.code) LIKE LOWER(:search) OR LOWER(accountType.name) LIKE LOWER(:search) OR LOWER(group.name) LIKE LOWER(:search))",
        { search: `%${search}%` },
      );
    }

    qb.orderBy("account.code", "ASC")
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();
    return {
      data: items,
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, companyId?: string): Promise<AccountAccount> {
    const where: any = { id };
    if (companyId) where.companyId = companyId;
    const account = await this.repo.findOne({
      where,
      relations: ["accountType", "group"],
    });
    if (!account) {
      throw new NotFoundException(`Account with ID '${id}' not found`);
    }
    return account;
  }

  async findByCode(code: string, companyId?: string): Promise<AccountAccount | null> {
    const where: any = { code, active: true };
    if (companyId) where.companyId = companyId;
    return this.repo.findOne({
      where,
      relations: ["accountType", "group"],
    });
  }

  async findOrCreateDefault(
    code: string,
    name: string,
    type: AccountType,
    reconcile = false,
    companyId?: string,
  ): Promise<AccountAccount> {
    const where: any = { code };
    if (companyId) where.companyId = companyId;
    let account = await this.repo.findOne({ where });
    if (!account) {
      account = this.repo.create({ code, name, type, reconcile, companyId });
      await this.repo.save(account);
    }
    return account;
  }

  async update(
    id: string,
    dto: UpdateAccountAccountDto,
    companyId?: string,
  ): Promise<AccountAccount> {
    const account = await this.findOne(id, companyId);
    if (dto.code && dto.code !== account.code) {
      const effectiveCompanyId = companyId || account.companyId;
      const existing = await this.repo.findOne({
        where: effectiveCompanyId ? { code: dto.code, companyId: effectiveCompanyId } : { code: dto.code },
      });
      if (existing && existing.id !== id) {
        throw new BadRequestException(
          `Account with code '${dto.code}' already exists for this company`,
        );
      }
    }
    if (dto.accountTypeId) {
      const type = await this.accountTypeRepo.findOne({
        where: { id: dto.accountTypeId },
      });
      if (!type) {
        throw new BadRequestException(
          `Account Type with ID '${dto.accountTypeId}' not found`,
        );
      }
    }
    if (dto.groupId) {
      const group = await this.accountGroupRepo.findOne({
        where: { id: dto.groupId },
      });
      if (!group) {
        throw new BadRequestException(
          `Account Group with ID '${dto.groupId}' not found`,
        );
      }
    }

    Object.assign(account, dto);
    return this.repo.save(account);
  }

  async remove(id: string, companyId?: string): Promise<void> {
    const account = await this.findOne(id, companyId);
    account.active = false;
    await this.repo.save(account);
  }

  async seedDefaults(): Promise<AccountAccount[]> {
    // Look up Odoo-style Account Types
    const [
      bankCashType,
      currentAssetsType,
      receivableType,
      payableType,
      currentLiabilitiesType,
      incomeType,
      cogsType,
      expenseType,
    ] = await Promise.all([
      this.accountTypeRepo.findOne({ where: { name: "Bank and Cash" } }),
      this.accountTypeRepo.findOne({ where: { name: "Current Assets" } }),
      this.accountTypeRepo.findOne({ where: { name: "Receivable" } }),
      this.accountTypeRepo.findOne({ where: { name: "Payable" } }),
      this.accountTypeRepo.findOne({ where: { name: "Current Liabilities" } }),
      this.accountTypeRepo.findOne({ where: { name: "Income / Revenue" } }),
      this.accountTypeRepo.findOne({
        where: { name: "Cost of Revenue / Goods Sold" },
      }),
      this.accountTypeRepo.findOne({ where: { name: "Expenses" } }),
    ]);

    // Look up Odoo-style Account Groups
    const [
      bankCashGroup,
      currentAssetsGroup,
      receivablesGroup,
      payablesGroup,
      currentLiabilitiesGroup,
      incomeGroup,
      cogsGroup,
      expenseGroup,
    ] = await Promise.all([
      this.accountGroupRepo.findOne({ where: { codePrefix: "101" } }),
      this.accountGroupRepo.findOne({ where: { codePrefix: "10" } }),
      this.accountGroupRepo.findOne({ where: { codePrefix: "11" } }),
      this.accountGroupRepo.findOne({ where: { codePrefix: "21" } }),
      this.accountGroupRepo.findOne({ where: { codePrefix: "20" } }),
      this.accountGroupRepo.findOne({ where: { codePrefix: "40" } }),
      this.accountGroupRepo.findOne({ where: { codePrefix: "50" } }),
      this.accountGroupRepo.findOne({ where: { codePrefix: "51" } }),
    ]);

    const defaultAccounts: Array<{
      code: string;
      name: string;
      type: AccountType;
      reconcile: boolean;
      accountTypeId?: string;
      groupId?: string;
    }> = [
      // Bank & Cash
      {
        code: "101100",
        name: "Cash on Hand",
        type: AccountType.CASH,
        reconcile: true,
        accountTypeId: bankCashType?.id,
        groupId: bankCashGroup?.id,
      },
      {
        code: "101400",
        name: "HDFC Bank Current A/c",
        type: AccountType.BANK,
        reconcile: true,
        accountTypeId: bankCashType?.id,
        groupId: bankCashGroup?.id,
      },
      {
        code: "101500",
        name: "State Bank of India A/c",
        type: AccountType.BANK,
        reconcile: true,
        accountTypeId: bankCashType?.id,
        groupId: bankCashGroup?.id,
      },

      // Stock / Current Assets
      {
        code: "101300",
        name: "Stock Interim Account (Received)",
        type: AccountType.CURRENT_ASSETS,
        reconcile: true,
        accountTypeId: currentAssetsType?.id,
        groupId: currentAssetsGroup?.id,
      },
      {
        code: "101310",
        name: "Stock Interim Account (Delivered)",
        type: AccountType.CURRENT_ASSETS,
        reconcile: true,
        accountTypeId: currentAssetsType?.id,
        groupId: currentAssetsGroup?.id,
      },
      {
        code: "101320",
        name: "Stock Valuation Account",
        type: AccountType.CURRENT_ASSETS,
        reconcile: false,
        accountTypeId: currentAssetsType?.id,
        groupId: currentAssetsGroup?.id,
      },

      // Receivables
      {
        code: "111000",
        name: "Accounts Receivable",
        type: AccountType.RECEIVABLE,
        reconcile: true,
        accountTypeId: receivableType?.id,
        groupId: receivablesGroup?.id,
      },

      // Payables
      {
        code: "211000",
        name: "Accounts Payable",
        type: AccountType.PAYABLE,
        reconcile: true,
        accountTypeId: payableType?.id,
        groupId: payablesGroup?.id,
      },

      // Input Taxes (Assets)
      {
        code: "105100",
        name: "Input CGST 9%",
        type: AccountType.TAX,
        reconcile: false,
        accountTypeId: currentAssetsType?.id,
        groupId: currentAssetsGroup?.id,
      },
      {
        code: "105200",
        name: "Input SGST 9%",
        type: AccountType.TAX,
        reconcile: false,
        accountTypeId: currentAssetsType?.id,
        groupId: currentAssetsGroup?.id,
      },
      {
        code: "105300",
        name: "Input IGST 18%",
        type: AccountType.TAX,
        reconcile: false,
        accountTypeId: currentAssetsType?.id,
        groupId: currentAssetsGroup?.id,
      },

      // Output Taxes (Current Liabilities)
      {
        code: "205100",
        name: "Output CGST 9%",
        type: AccountType.TAX,
        reconcile: false,
        accountTypeId: currentLiabilitiesType?.id,
        groupId: currentLiabilitiesGroup?.id,
      },
      {
        code: "205200",
        name: "Output SGST 9%",
        type: AccountType.TAX,
        reconcile: false,
        accountTypeId: currentLiabilitiesType?.id,
        groupId: currentLiabilitiesGroup?.id,
      },
      {
        code: "205300",
        name: "Output IGST 18%",
        type: AccountType.TAX,
        reconcile: false,
        accountTypeId: currentLiabilitiesType?.id,
        groupId: currentLiabilitiesGroup?.id,
      },

      // Income / Revenue
      {
        code: "401000",
        name: "Product Sales Revenue",
        type: AccountType.INCOME,
        reconcile: false,
        accountTypeId: incomeType?.id,
        groupId: incomeGroup?.id,
      },

      // COGS / Purchases
      {
        code: "501000",
        name: "Cost of Goods Sold / Purchases",
        type: AccountType.EXPENSE,
        reconcile: false,
        accountTypeId: cogsType?.id,
        groupId: cogsGroup?.id,
      },

      // Operating Expenses
      {
        code: "502000",
        name: "Operating Expenses",
        type: AccountType.EXPENSE,
        reconcile: false,
        accountTypeId: expenseType?.id,
        groupId: expenseGroup?.id,
      },
    ];

    const results: AccountAccount[] = [];
    for (const acc of defaultAccounts) {
      let existing = await this.repo.findOne({ where: { code: acc.code } });
      if (!existing) {
        existing = await this.repo.save(this.repo.create(acc));
      } else {
        let updated = false;
        if (acc.accountTypeId && !existing.accountTypeId) {
          existing.accountTypeId = acc.accountTypeId;
          updated = true;
        }
        if (acc.groupId && !existing.groupId) {
          existing.groupId = acc.groupId;
          updated = true;
        }
        if (updated) {
          await this.repo.save(existing);
        }
      }
      results.push(existing);
    }
    return results;
  }


  async clearAllAccountingData(): Promise<{ message: string }> {
    const queryRunner = this.repo.manager.connection.createQueryRunner();
    await queryRunner.connect();
    try {
      await queryRunner.query(
        `UPDATE purchase_orders SET vendor_bill_id = NULL WHERE vendor_bill_id IS NOT NULL;`
      );
      await queryRunner.query(`DELETE FROM vendor_bill_lines;`);
      await queryRunner.query(`DELETE FROM vendor_bills;`);
      await queryRunner.query(`DELETE FROM account_move_lines;`);
      await queryRunner.query(`DELETE FROM account_moves;`);
      await queryRunner.query(`DELETE FROM account_accounts;`);
      await queryRunner.query(`UPDATE account_groups SET parent_id = NULL;`);
      await queryRunner.query(`DELETE FROM account_groups;`);
      await queryRunner.query(`DELETE FROM account_types;`);
      await queryRunner.query(`DELETE FROM account_journals;`);
      return { message: "All accounting data has been successfully cleared." };
    } finally {
      await queryRunner.release();
    }
  }
}

