import "reflect-metadata";
import * as bcrypt from "bcrypt";
import dataSource from "./data-source";
import { Role } from "../roles/entities/role.entity";
import { User } from "../users/entities/user.entity";
import { UomCategory } from "../uom/entities/uom-category.entity";
import { Uom, UomType } from "../uom/entities/uom.entity";
import { Warehouse } from "../warehouses/entities/warehouse.entity";
import { Location, LocationUsage } from "../locations/entities/location.entity";
import { AccountJournal } from "../account-journals/entities/account-journal.entity";
import { AccountJournalType } from "../account-journals/enums/account-journal.enum";
import { AccountTypeEntity } from "../account-types/entities/account-type.entity";
import {
  AccountInternalGroup,
  AccountTypeCategory,
} from "../account-types/enums/account-type-category.enum";
import { AccountGroup } from "../account-groups/entities/account-group.entity";
import { AccountAccount } from "../account-accounts/entities/account-account.entity";
import { AccountType } from "../account-accounts/enums/account-account.enum";

async function seed() {
  const ds = await dataSource.initialize();
  console.log("📦 Connected to database, seeding...");

  // --- Roles ---
  const roleRepo = ds.getRepository(Role);
  const roleNames = [
    { name: "admin", description: "Full system access" },
    {
      name: "sales_manager",
      description: "Manage customers, pricelists, products",
    },
    {
      name: "purchase_manager",
      description: "Manage vendors, purchase-side data",
    },
    {
      name: "inventory_manager",
      description: "Manage products, warehouses, locations",
    },
    { name: "accountant", description: "Manage taxes and payment terms" },
  ];
  for (const r of roleNames) {
    const exists = await roleRepo.findOne({ where: { name: r.name } });
    if (!exists) await roleRepo.save(roleRepo.create(r));
  }
  const adminRole = await roleRepo.findOne({ where: { name: "admin" } });
  console.log("✅ Roles seeded");

  // --- Admin user ---
  const userRepo = ds.getRepository(User);
  const adminEmail = "admin@example.com";
  const existingAdmin = await userRepo.findOne({
    where: { email: adminEmail },
  });
  if (!existingAdmin) {
    await userRepo.save(
      userRepo.create({
        name: "Administrator",
        email: adminEmail,
        password: await bcrypt.hash("Admin@123", 10),
        roleId: adminRole?.id,
      }),
    );
    console.log(
      `✅ Admin user created -> ${adminEmail} / Admin@123 (change this immediately)`,
    );
  } else {
    console.log("ℹ️  Admin user already exists, skipping");
  }

  // --- UoM categories & base units ---
  const catRepo = ds.getRepository(UomCategory);
  const uomRepo = ds.getRepository(Uom);

  const unitCat =
    (await catRepo.findOne({ where: { name: "Unit" } })) ??
    (await catRepo.save(catRepo.create({ name: "Unit" })));
  const weightCat =
    (await catRepo.findOne({ where: { name: "Weight" } })) ??
    (await catRepo.save(catRepo.create({ name: "Weight" })));
  const volumeCat =
    (await catRepo.findOne({ where: { name: "Volume" } })) ??
    (await catRepo.save(catRepo.create({ name: "Volume" })));

  const baseUoms = [
    {
      name: "Unit(s)",
      code: "unit",
      categoryId: unitCat.id,
      uomType: UomType.REFERENCE,
      factor: 1,
    },
    {
      name: "Dozen(s)",
      code: "dz",
      categoryId: unitCat.id,
      uomType: UomType.BIGGER,
      factor: 12,
    },
    {
      name: "Kilogram",
      code: "kg",
      categoryId: weightCat.id,
      uomType: UomType.REFERENCE,
      factor: 1,
    },
    {
      name: "Gram",
      code: "g",
      categoryId: weightCat.id,
      uomType: UomType.SMALLER,
      factor: 0.001,
    },
    {
      name: "Liter",
      code: "L",
      categoryId: volumeCat.id,
      uomType: UomType.REFERENCE,
      factor: 1,
    },
    {
      name: "Milliliter",
      code: "mL",
      categoryId: volumeCat.id,
      uomType: UomType.SMALLER,
      factor: 0.001,
    },
  ];
  for (const u of baseUoms) {
    const exists = await uomRepo.findOne({
      where: { name: u.name, categoryId: u.categoryId },
    });
    if (!exists) await uomRepo.save(uomRepo.create(u));
  }
  console.log("✅ UoM categories & base units seeded");

  // --- Default warehouse & standard location tree ---
  // Gives the Stock Receipt / Delivery / Internal Transfer / Adjustment
  // endpoints somewhere real to move product to/from right out of the box.
  const warehouseRepo = ds.getRepository(Warehouse);
  const locationRepo = ds.getRepository(Location);

  const warehouse =
    (await warehouseRepo.findOne({ where: { code: "WH1" } })) ??
    (await warehouseRepo.save(
      warehouseRepo.create({ name: "Main Warehouse", code: "WH1" }),
    ));

  const viewRoot =
    (await locationRepo.findOne({
      where: { name: "WH1", usage: LocationUsage.VIEW },
    })) ??
    (await locationRepo.save(
      locationRepo.create({
        name: "WH1",
        completeName: "WH1",
        usage: LocationUsage.VIEW,
        warehouseId: warehouse.id,
      }),
    ));

  const ensureLocation = async (
    name: string,
    usage: LocationUsage,
    opts: { parentId?: string; warehouseId?: string } = {},
  ) => {
    const existing = await locationRepo.findOne({ where: { name, usage } });
    if (existing) return existing;
    return locationRepo.save(
      locationRepo.create({
        name,
        completeName: opts.parentId ? `${viewRoot.name} / ${name}` : name,
        usage,
        parentId: opts.parentId,
        warehouseId: opts.warehouseId,
      }),
    );
  };

  await ensureLocation("Stock", LocationUsage.INTERNAL, {
    parentId: viewRoot.id,
    warehouseId: warehouse.id,
  });
  await ensureLocation("Vendors", LocationUsage.VENDOR);
  await ensureLocation("Customers", LocationUsage.CUSTOMER);
  await ensureLocation("Inventory Adjustment", LocationUsage.INVENTORY);
  await ensureLocation("Transit", LocationUsage.TRANSIT);
  console.log(
    "✅ Default warehouse (WH1) & location tree seeded (Stock/Vendors/Customers/Inventory Adjustment/Transit)",
  );

  // --- Account Types (Odoo standard) ---
  const typeRepo = ds.getRepository(AccountTypeEntity);
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

  const typeMap = new Map<string, AccountTypeEntity>();
  for (const dt of defaultTypes) {
    let existing = await typeRepo.findOne({ where: { name: dt.name } });
    if (!existing) {
      existing = await typeRepo.save(typeRepo.create(dt));
    }
    typeMap.set(dt.name, existing);
  }
  console.log("✅ Account types seeded (15 standard Odoo types)");

  // --- Account Groups (Odoo standard) ---
  const groupRepo = ds.getRepository(AccountGroup);
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

  const groupMap = new Map<string, AccountGroup>();
  for (const dg of defaultGroups) {
    let existing = await groupRepo.findOne({
      where: { name: dg.name, codePrefix: dg.codePrefix },
    });
    const typeEntity = dg.accountTypeName
      ? typeMap.get(dg.accountTypeName)
      : undefined;
    if (!existing) {
      existing = await groupRepo.save(
        groupRepo.create({
          name: dg.name,
          codePrefix: dg.codePrefix,
          accountTypeId: typeEntity?.id,
        }),
      );
    }
    groupMap.set(dg.name, existing);
  }
  console.log("✅ Account groups seeded (11 standard Odoo prefix groups)");

  // --- Chart of Accounts (Odoo standard) ---
  const accountRepo = ds.getRepository(AccountAccount);
  const defaultAccounts = [
    {
      code: "101000",
      name: "Bank Current Account",
      type: AccountType.BANK,
      accountTypeName: "Bank and Cash",
      groupName: "Bank & Cash",
      reconcile: true,
      currency: "INR",
    },
    {
      code: "102000",
      name: "Petty Cash",
      type: AccountType.CASH,
      accountTypeName: "Bank and Cash",
      groupName: "Bank & Cash",
      reconcile: true,
      currency: "INR",
    },
    {
      code: "110000",
      name: "Trade Debtors / Accounts Receivable",
      type: AccountType.RECEIVABLE,
      accountTypeName: "Receivable",
      groupName: "Trade Receivables",
      reconcile: true,
      currency: "INR",
    },
    {
      code: "120000",
      name: "Stock / Inventory Valuation Account",
      type: AccountType.CURRENT_ASSETS,
      accountTypeName: "Current Assets",
      groupName: "Current Assets",
      reconcile: false,
      currency: "INR",
    },
    {
      code: "210000",
      name: "Trade Creditors / Accounts Payable",
      type: AccountType.PAYABLE,
      accountTypeName: "Payable",
      groupName: "Trade Payables",
      reconcile: true,
      currency: "INR",
    },
    {
      code: "220000",
      name: "GST / Tax Output & Input Clearing",
      type: AccountType.TAX,
      accountTypeName: "Current Liabilities",
      groupName: "Current Liabilities",
      reconcile: false,
      currency: "INR",
    },
    {
      code: "300000",
      name: "Capital / Retained Earnings",
      type: AccountType.EQUITY,
      accountTypeName: "Equity",
      groupName: "Equity & Reserves",
      reconcile: false,
      currency: "INR",
    },
    {
      code: "400000",
      name: "Product Sales / Revenue",
      type: AccountType.INCOME,
      accountTypeName: "Income / Revenue",
      groupName: "Operating Income",
      reconcile: false,
      currency: "INR",
    },
    {
      code: "500000",
      name: "Cost of Goods Sold (COGS)",
      type: AccountType.EXPENSE,
      accountTypeName: "Cost of Revenue / Goods Sold",
      groupName: "Cost of Goods Sold",
      reconcile: false,
      currency: "INR",
    },
    {
      code: "600000",
      name: "Operating Expenses / Freight / Misc",
      type: AccountType.EXPENSE,
      accountTypeName: "Expenses",
      groupName: "Operating Expenses",
      reconcile: false,
      currency: "INR",
    },
  ];

  const accountMap = new Map<string, AccountAccount>();
  for (const a of defaultAccounts) {
    let existing = await accountRepo.findOne({ where: { code: a.code } });
    const typeEntity = a.accountTypeName
      ? typeMap.get(a.accountTypeName)
      : undefined;
    const groupEntity = a.groupName ? groupMap.get(a.groupName) : undefined;
    if (!existing) {
      existing = await accountRepo.save(
        accountRepo.create({
          code: a.code,
          name: a.name,
          type: a.type,
          accountTypeId: typeEntity?.id,
          groupId: groupEntity?.id,
          reconcile: a.reconcile,
          currency: a.currency,
        }),
      );
    }
    accountMap.set(a.code, existing);
  }
  console.log("✅ Chart of Accounts seeded (10 standard Odoo accounts)");

  // --- Account journals ---
  const journalRepo = ds.getRepository(AccountJournal);
  const defaultJournals = [
    {
      name: "Vendor Bills",
      type: AccountJournalType.PURCHASE,
      code: "BILL",
      defaultAccountId: accountMap.get("210000")?.id,
    },
    {
      name: "Customer Invoices",
      type: AccountJournalType.SALE,
      code: "INV",
      defaultAccountId: accountMap.get("110000")?.id,
    },
    {
      name: "HDFC Bank Current Account",
      type: AccountJournalType.BANK,
      code: "BNK",
      bankName: "HDFC Bank",
      bankAccountNumber: "50200012345678",
      defaultAccountId: accountMap.get("101000")?.id,
    },
    {
      name: "SBI Bank Account",
      type: AccountJournalType.BANK,
      code: "SBI",
      bankName: "State Bank of India",
      bankAccountNumber: "30894561234",
      defaultAccountId: accountMap.get("101000")?.id,
    },
    {
      name: "Cash",
      type: AccountJournalType.CASH,
      code: "CSH",
      defaultAccountId: accountMap.get("102000")?.id,
    },
  ];
  for (const j of defaultJournals) {
    let existing = await journalRepo.findOne({ where: { code: j.code } });
    if (!existing) {
      await journalRepo.save(journalRepo.create(j));
    } else {
      Object.assign(existing, j);
      await journalRepo.save(existing);
    }
  }
  console.log(
    "✅ Account journals seeded (Vendor Bills, Customer Invoices, HDFC Bank, SBI Bank, Cash)",
  );

  await ds.destroy();
  console.log("🎉 Seed complete");
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
