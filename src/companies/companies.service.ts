import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from './entities/company.entity';
import { CreateCompanyDto } from './dto/create-company.dto';
import { Warehouse } from '../warehouses/entities/warehouse.entity';
import { Location, LocationUsage } from '../locations/entities/location.entity';
import { ProductCategory } from '../product-category/entities/product-category.entity';
import { UomCategory } from '../uom/entities/uom-category.entity';
import { Uom, UomType } from '../uom/entities/uom.entity';
import { AccountTypeEntity } from '../account-types/entities/account-type.entity';
import {
  AccountInternalGroup,
  AccountTypeCategory,
} from '../account-types/enums/account-type-category.enum';
import { AccountGroup } from '../account-groups/entities/account-group.entity';
import { AccountAccount } from '../account-accounts/entities/account-account.entity';
import { AccountType } from '../account-accounts/enums/account-account.enum';
import { OperationTypesService } from '../operation-types/operation-types.service';

@Injectable()
export class CompaniesService implements OnModuleInit {
  private readonly logger = new Logger(CompaniesService.name);

  constructor(
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    @InjectRepository(Warehouse)
    private readonly warehouseRepo: Repository<Warehouse>,
    @InjectRepository(Location)
    private readonly locationRepo: Repository<Location>,
    private readonly operationTypesService: OperationTypesService,
    @InjectRepository(ProductCategory)
    private readonly categoryRepo: Repository<ProductCategory>,
    @InjectRepository(UomCategory)
    private readonly uomCatRepo: Repository<UomCategory>,
    @InjectRepository(Uom)
    private readonly uomRepo: Repository<Uom>,
    @InjectRepository(AccountTypeEntity)
    private readonly accountTypeRepo: Repository<AccountTypeEntity>,
    @InjectRepository(AccountGroup)
    private readonly accountGroupRepo: Repository<AccountGroup>,
    @InjectRepository(AccountAccount)
    private readonly accountRepo: Repository<AccountAccount>,
  ) {}

  async onModuleInit() {
    try {
      const qr = this.companyRepo.manager.connection.createQueryRunner();
      await qr.connect();
      try {
        const checkTable = await qr.query(`
          SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = '_accounting_reset_v4';
        `);
        if (!checkTable || checkTable.length === 0) {
          this.logger.log('Resetting all old accounting data to clean default structure for all companies...');
          await qr.query(`UPDATE purchase_orders SET vendor_bill_id = NULL WHERE vendor_bill_id IS NOT NULL;`).catch(() => {});
          await qr.query(`DELETE FROM vendor_bill_lines;`).catch(() => {});
          await qr.query(`DELETE FROM vendor_bills;`).catch(() => {});
          await qr.query(`DELETE FROM account_move_lines;`).catch(() => {});
          await qr.query(`DELETE FROM account_moves;`).catch(() => {});
          await qr.query(`UPDATE partners SET account_receivable_id = NULL, account_payable_id = NULL;`).catch(() => {});
          await qr.query(`DELETE FROM account_accounts;`).catch(() => {});
          await qr.query(`UPDATE account_groups SET parent_id = NULL;`).catch(() => {});
          await qr.query(`DELETE FROM account_groups;`).catch(() => {});
          await qr.query(`DELETE FROM account_types;`).catch(() => {});
          await qr.query(`CREATE TABLE IF NOT EXISTS _accounting_reset_v4 (id serial primary key, created_at timestamp default now());`).catch(() => {});
          this.logger.log('Old accounting data successfully cleared.');
        }
      } finally {
        await qr.release();
      }

      const companies = await this.companyRepo.find();
      for (const comp of companies) {
        await this.bootstrapCompanyMasterData(comp);
      }
    } catch (err: any) {
      this.logger.warn(`Master data auto-bootstrap check warning: ${err.message}`);
    }
  }

  async create(dto: CreateCompanyDto): Promise<Company> {
    const company = this.companyRepo.create(dto);
    const saved = await this.companyRepo.save(company);
    await this.bootstrapCompanyMasterData(saved);
    return saved;
  }

  async findAll(): Promise<Company[]> {
    return this.companyRepo.find({ order: { name: 'ASC' } });
  }

  async getPublicList(): Promise<any[]> {
    return this.companyRepo.find({
      select: ['id', 'name', 'code', 'companyType', 'city', 'state', 'country'],
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Company> {
    const comp = await this.companyRepo.findOne({ where: { id } });
    if (!comp) throw new NotFoundException(`Company ${id} not found`);
    return comp;
  }

  /**
   * Bootstraps default warehouse, locations, categories, UoMs and journals for a newly created company
   */
  async bootstrapCompanyMasterData(company: Company): Promise<void> {
    this.logger.log(`Bootstrapping default master data for company "${company.name}" (${company.id})...`);

    // 1. Default Warehouse
    const shortCode = (company.code || company.name.substring(0, 3)).toUpperCase().replace(/[^A-Z0-9]/g, '');
    const whCode = `${shortCode || 'WH'}_1`;

    let warehouse = await this.warehouseRepo.findOne({
      where: [{ companyId: company.id }, { code: whCode, companyId: company.id }],
    });

    if (!warehouse) {
      warehouse = await this.warehouseRepo.save(
        this.warehouseRepo.create({
          name: `${company.name} Main Warehouse`,
          code: whCode,
          companyId: company.id,
          city: company.city || undefined,
          country: company.country || 'India',
        }),
      );
    }

    // 2. Default Locations Tree (strictly scoped to company)
    let viewRoot = await this.locationRepo.findOne({
      where: { warehouseId: warehouse.id, usage: LocationUsage.VIEW, companyId: company.id },
    });

    if (!viewRoot) {
      viewRoot = await this.locationRepo.save(
        this.locationRepo.create({
          name: whCode,
          completeName: whCode,
          usage: LocationUsage.VIEW,
          warehouseId: warehouse.id,
          companyId: company.id,
        }),
      );
    }

    const ensureLocation = async (
      name: string,
      usage: LocationUsage,
      opts: { parentId?: string; warehouseId?: string } = {},
    ) => {
      const existing = await this.locationRepo.findOne({
        where: { name, warehouseId: opts.warehouseId, usage, companyId: company.id },
      });
      if (existing) return existing;
      return this.locationRepo.save(
        this.locationRepo.create({
          name,
          completeName: opts.parentId ? `${viewRoot.name} / ${name}` : name,
          usage,
          parentId: opts.parentId,
          warehouseId: opts.warehouseId,
          companyId: company.id,
        }),
      );
    };

    await ensureLocation('Stock', LocationUsage.INTERNAL, {
      parentId: viewRoot.id,
      warehouseId: warehouse.id,
    });
    await ensureLocation(`${whCode} Vendors`, LocationUsage.VENDOR, {
      warehouseId: warehouse.id,
    });
    await ensureLocation(`${whCode} Customers`, LocationUsage.CUSTOMER, {
      warehouseId: warehouse.id,
    });
    await ensureLocation(`${whCode} Inventory Adjustment`, LocationUsage.INVENTORY, {
      warehouseId: warehouse.id,
    });
    await ensureLocation(`${whCode} Transit`, LocationUsage.TRANSIT, {
      warehouseId: warehouse.id,
    });

    // 2.1 Default Operation Types for Warehouse (Receipts, Delivery Orders, Internal Transfers)
    try {
      await this.operationTypesService.ensureDefaultOperationTypesForWarehouse(
        warehouse,
        company.id,
      );
    } catch (err: any) {
      this.logger.warn(`Could not bootstrap operation types for ${company.name}: ${err.message}`);
    }

    // 3. Default Product Categories (strictly scoped to company)
    let allCat = await this.categoryRepo.findOne({
      where: { name: 'All', companyId: company.id },
    });
    if (!allCat) {
      allCat = await this.categoryRepo.save(
        this.categoryRepo.create({
          name: 'All',
          completeName: 'All',
          companyId: company.id,
        }),
      );
    }

    const ensureSubCategory = async (name: string) => {
      const existing = await this.categoryRepo.findOne({
        where: { name, companyId: company.id },
      });
      if (existing) return existing;
      return this.categoryRepo.save(
        this.categoryRepo.create({
          name,
          completeName: `All / ${name}`,
          parentId: allCat.id,
          companyId: company.id,
        }),
      );
    };

    await ensureSubCategory('Goods');
    await ensureSubCategory('Consumables');
    await ensureSubCategory('Services');

    // 4. Default UoM Categories & Base Units (Clean, minimal set strictly scoped to company)
    const ensureUomCategory = async (name: string) => {
      const existing = await this.uomCatRepo.findOne({
        where: { name, companyId: company.id },
      });
      if (existing) return existing;
      return this.uomCatRepo.save(
        this.uomCatRepo.create({ name, companyId: company.id }),
      );
    };

    const unitCat = await ensureUomCategory('Unit');
    const weightCat = await ensureUomCategory('Weight');

    const ensureUom = async (
      name: string,
      code: string,
      categoryId: string,
      uomType: UomType,
      factor: number,
    ) => {
      const existing = await this.uomRepo.findOne({
        where: { name, categoryId, companyId: company.id },
      });
      if (existing) return existing;
      return this.uomRepo.save(
        this.uomRepo.create({
          name,
          code,
          categoryId,
          uomType,
          factor,
          companyId: company.id,
        }),
      );
    };

    await ensureUom('Unit(s)', 'unit', unitCat.id, UomType.REFERENCE, 1);
    await ensureUom('Dozen(s)', 'dz', unitCat.id, UomType.BIGGER, 12);
    await ensureUom('Kilogram', 'kg', weightCat.id, UomType.REFERENCE, 1);
    await ensureUom('Gram', 'g', weightCat.id, UomType.SMALLER, 0.001);

    // 5. Default Accounting Types (Primary & Sub-types)
    const ensureAccountType = async (
      name: string,
      type: AccountTypeCategory,
      internalGroup: AccountInternalGroup,
      includeInitialBalance = true,
      notes?: string,
    ) => {
      let existing = await this.accountTypeRepo.findOne({
        where: { name, companyId: company.id },
      });
      if (!existing) {
        existing = await this.accountTypeRepo.save(
          this.accountTypeRepo.create({
            name,
            type,
            internalGroup,
            includeInitialBalance,
            notes,
            companyId: company.id,
          }),
        );
      }
      return existing;
    };

    const assetType = await ensureAccountType('Asset', AccountTypeCategory.REGULAR, AccountInternalGroup.ASSET, true, 'Primary');
    const liabilityType = await ensureAccountType('Liability', AccountTypeCategory.REGULAR, AccountInternalGroup.LIABILITY, true, 'Primary');
    const incomeType = await ensureAccountType('Income', AccountTypeCategory.REGULAR, AccountInternalGroup.INCOME, false, 'Primary');
    const expenseType = await ensureAccountType('Expense', AccountTypeCategory.REGULAR, AccountInternalGroup.EXPENSE, false, 'Primary');
    const customerType = await ensureAccountType('Customer', AccountTypeCategory.RECEIVABLE, AccountInternalGroup.ASSET, true, 'Customer');
    const vendorType = await ensureAccountType('Vendor', AccountTypeCategory.PAYABLE, AccountInternalGroup.LIABILITY, true, 'Vendor');

    // 6. Default Account Groups (Primary Groups & Hierarchy)
    const ensureAccountGroup = async (
      name: string,
      codePrefix: string,
      accountTypeId: string,
      parentId?: string,
    ) => {
      let existing = await this.accountGroupRepo.findOne({
        where: { name, companyId: company.id },
      });
      if (!existing) {
        existing = await this.accountGroupRepo.save(
          this.accountGroupRepo.create({
            name,
            codePrefix,
            accountTypeId,
            parentId,
            companyId: company.id,
          }),
        );
      } else {
        let updated = false;
        if (existing.parentId !== parentId) {
          existing.parentId = parentId;
          updated = true;
        }
        if (existing.accountTypeId !== accountTypeId) {
          existing.accountTypeId = accountTypeId;
          updated = true;
        }
        if (existing.codePrefix !== codePrefix) {
          existing.codePrefix = codePrefix;
          updated = true;
        }
        if (updated) {
          existing = await this.accountGroupRepo.save(existing);
        }
      }
      return existing;
    };

    // Primary Groups (Asset, Liability, Income, Expense)
    const assetGroup = await ensureAccountGroup('Asset', '1', assetType.id);
    const liabilityGroup = await ensureAccountGroup('Liability', '2', liabilityType.id);
    const incomeGroup = await ensureAccountGroup('Income', '4', incomeType.id);
    const expenseGroup = await ensureAccountGroup('Expense', '5', expenseType.id);

    // Other Groups:
    // Current Assets -> Parent: Asset
    const currentAssetsGroup = await ensureAccountGroup('Current Assets', '10', assetType.id, assetGroup.id);
    // Sundry Debtor -> Parent: Current Assets
    const sundryDebtorGroup = await ensureAccountGroup('Sundry Debtor', '105', customerType.id, currentAssetsGroup.id);

    // Current liabilities -> Parent: Liability
    const currentLiabilitiesGroup = await ensureAccountGroup('Current liabilities', '20', liabilityType.id, liabilityGroup.id);
    // Sundry Creditor -> Parent: Current liabilities
    const sundryCreditorGroup = await ensureAccountGroup('Sundry Creditor', '205', vendorType.id, currentLiabilitiesGroup.id);
    // Duties & Taxes -> Parent: Current liabilities
    const dutiesTaxesGroup = await ensureAccountGroup('Duties & Taxes', '206', liabilityType.id, currentLiabilitiesGroup.id);

    // Sales Accounts -> Parent: Income
    const salesAccountsGroup = await ensureAccountGroup('Sales Accounts', '40', incomeType.id, incomeGroup.id);

    // Purchase Accounts -> Parent: Expense
    const purchaseAccountsGroup = await ensureAccountGroup('Purchase Accounts', '50', expenseType.id, expenseGroup.id);

    // 7. Default Chart of Accounts (Basic Ledgers)
    const ensureAccount = async (
      code: string,
      name: string,
      type: AccountType,
      accountTypeId: string,
      groupId: string,
      reconcile = false,
    ) => {
      let existing = await this.accountRepo.findOne({
        where: { code, companyId: company.id },
      });
      if (!existing) {
        existing = await this.accountRepo.findOne({
          where: { name, companyId: company.id },
        });
      }
      if (!existing) {
        existing = await this.accountRepo.save(
          this.accountRepo.create({
            code,
            name,
            type,
            accountTypeId,
            groupId,
            reconcile,
            currency: 'INR',
            companyId: company.id,
          }),
        );
      } else {
        existing.code = code;
        existing.name = name;
        existing.type = type;
        existing.accountTypeId = accountTypeId;
        existing.groupId = groupId;
        existing.reconcile = reconcile;
        existing = await this.accountRepo.save(existing);
      }
      return existing;
    };

    // Sales Accounts Group:
    await ensureAccount('401001', 'Local Sales @5%', AccountType.INCOME, incomeType.id, salesAccountsGroup.id, false);
    await ensureAccount('401002', 'Central Sales @5%', AccountType.INCOME, incomeType.id, salesAccountsGroup.id, false);

    // Purchase Accounts Group:
    await ensureAccount('501001', 'Local Purchase @5%', AccountType.EXPENSE, expenseType.id, purchaseAccountsGroup.id, false);
    await ensureAccount('501002', 'Central Purchase @5%', AccountType.EXPENSE, expenseType.id, purchaseAccountsGroup.id, false);

    // Sundry Debtor Group:
    const customerLedger = await ensureAccount('105001', 'Customer Ledger', AccountType.RECEIVABLE, customerType.id, sundryDebtorGroup.id, true);

    // Sundry Creditor Group:
    const vendorLedger = await ensureAccount('205001', 'Vendor Ledger', AccountType.PAYABLE, vendorType.id, sundryCreditorGroup.id, true);

    // Duties & Taxes Group:
    await ensureAccount('206001', 'CGST Sales Tax @2.5%', AccountType.TAX, liabilityType.id, dutiesTaxesGroup.id, false);
    await ensureAccount('206002', 'SGST Sales Tax @2.5%', AccountType.TAX, liabilityType.id, dutiesTaxesGroup.id, false);
    await ensureAccount('206003', 'IGST Sales Tax @5%', AccountType.TAX, liabilityType.id, dutiesTaxesGroup.id, false);
    await ensureAccount('206004', 'CGST Purchase Tax @2.5%', AccountType.TAX, liabilityType.id, dutiesTaxesGroup.id, false);
    await ensureAccount('206005', 'SGST Purchase Tax @2.5%', AccountType.TAX, liabilityType.id, dutiesTaxesGroup.id, false);
    await ensureAccount('206006', 'IGST Purchase Tax @5%', AccountType.TAX, liabilityType.id, dutiesTaxesGroup.id, false);

    // Link default customer & vendor ledgers to partners of this company without accounts set
    await this.companyRepo.manager.query(
      `UPDATE partners SET account_receivable_id = $1 WHERE company_id = $2 AND account_receivable_id IS NULL`,
      [customerLedger.id, company.id],
    ).catch(() => {});
    await this.companyRepo.manager.query(
      `UPDATE partners SET account_payable_id = $1 WHERE company_id = $2 AND account_payable_id IS NULL`,
      [vendorLedger.id, company.id],
    ).catch(() => {});

    this.logger.log(`Default master data bootstrapped successfully for company "${company.name}".`);
  }
}

