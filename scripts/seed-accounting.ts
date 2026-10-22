import "reflect-metadata";
import dataSource from "../src/database/data-source";
import { Company } from "../src/companies/entities/company.entity";
import { AccountTypeEntity } from "../src/account-types/entities/account-type.entity";
import {
  AccountInternalGroup,
  AccountTypeCategory,
} from "../src/account-types/enums/account-type-category.enum";
import { AccountGroup } from "../src/account-groups/entities/account-group.entity";
import { AccountAccount } from "../src/account-accounts/entities/account-account.entity";
import { AccountType } from "../src/account-accounts/enums/account-account.enum";

async function seedCompanyAccounting() {
  console.log("🔌 Connecting to database...");
  const ds = await dataSource.initialize();
  const companyRepo = ds.getRepository(Company);
  const typeRepo = ds.getRepository(AccountTypeEntity);
  const groupRepo = ds.getRepository(AccountGroup);
  const accountRepo = ds.getRepository(AccountAccount);

  const companies = await companyRepo.find();
  console.log(`Found ${companies.length} company(ies) to seed.`);

  for (const company of companies) {
    console.log(`\n🏢 Seeding accounting data for: "${company.name}" (${company.id})`);

    // 1. Primary Account Types & Roles
    const ensureType = async (
      name: string,
      type: AccountTypeCategory,
      internalGroup: AccountInternalGroup,
      includeInitialBalance = true,
      notes?: string
    ) => {
      let existing = await typeRepo.findOne({
        where: { name, companyId: company.id },
      });
      if (!existing) {
        existing = await typeRepo.save(
          typeRepo.create({
            name,
            type,
            internalGroup,
            includeInitialBalance,
            notes,
            companyId: company.id,
          })
        );
      }
      return existing;
    };

    const assetType = await ensureType("Asset", AccountTypeCategory.REGULAR, AccountInternalGroup.ASSET, true, "Primary");
    const liabilityType = await ensureType("Liability", AccountTypeCategory.REGULAR, AccountInternalGroup.LIABILITY, true, "Primary");
    const incomeType = await ensureType("Income", AccountTypeCategory.REGULAR, AccountInternalGroup.INCOME, false, "Primary");
    const expenseType = await ensureType("Expense", AccountTypeCategory.REGULAR, AccountInternalGroup.EXPENSE, false, "Primary");
    const customerType = await ensureType("Customer", AccountTypeCategory.RECEIVABLE, AccountInternalGroup.ASSET, true, "Customer");
    const vendorType = await ensureType("Vendor", AccountTypeCategory.PAYABLE, AccountInternalGroup.LIABILITY, true, "Vendor");

    console.log("  ✅ Primary & role account types ready");

    // 2. Account Groups
    const ensureGroup = async (
      name: string,
      codePrefix: string,
      accountTypeId: string,
      parentId?: string
    ) => {
      let existing = await groupRepo.findOne({
        where: { name, companyId: company.id },
      });
      if (!existing) {
        existing = await groupRepo.save(
          groupRepo.create({
            name,
            codePrefix,
            accountTypeId,
            parentId,
            companyId: company.id,
          })
        );
      }
      return existing;
    };

    const assetGroup = await ensureGroup("Asset", "10", assetType.id);
    const sundryDebtorGroup = await ensureGroup("Sundry Debtor", "105", customerType.id, assetGroup.id);

    const currentLiabilitiesGroup = await ensureGroup("Current liabilities", "20", liabilityType.id);
    const sundryCreditorGroup = await ensureGroup("Sundry Creditor", "205", vendorType.id, currentLiabilitiesGroup.id);
    const dutiesTaxesGroup = await ensureGroup("Duties & Taxes", "206", liabilityType.id, currentLiabilitiesGroup.id);

    const salesAccountsGroup = await ensureGroup("Sales Accounts", "40", incomeType.id);
    const purchaseAccountsGroup = await ensureGroup("Purchase Accounts", "50", expenseType.id);

    console.log("  ✅ Account groups ready");

    // 3. Chart of Accounts
    const ensureAccount = async (
      code: string,
      name: string,
      type: AccountType,
      accountTypeId: string,
      groupId: string,
      reconcile = false
    ) => {
      let existing = await accountRepo.findOne({
        where: { code, companyId: company.id },
      });
      if (!existing) {
        existing = await accountRepo.save(
          accountRepo.create({
            code,
            name,
            type,
            accountTypeId,
            groupId,
            reconcile,
            currency: "INR",
            companyId: company.id,
          })
        );
      }
      return existing;
    };

    await ensureAccount("105001", "Sundry Debtor", AccountType.RECEIVABLE, customerType.id, sundryDebtorGroup.id, true);
    await ensureAccount("205001", "Sundry Creditor", AccountType.PAYABLE, vendorType.id, sundryCreditorGroup.id, true);
    await ensureAccount("206001", "Duties & Taxes", AccountType.TAX, liabilityType.id, dutiesTaxesGroup.id, false);
    await ensureAccount("401001", "Sales Accounts", AccountType.INCOME, incomeType.id, salesAccountsGroup.id, false);
    await ensureAccount("501001", "Purchase Accounts", AccountType.EXPENSE, expenseType.id, purchaseAccountsGroup.id, false);

    console.log("  ✅ Default chart of accounts ready");
  }

  await ds.destroy();
  console.log("\n🎉 Seeding completed successfully for all companies!");
}

seedCompanyAccounting().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
