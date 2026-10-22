import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

import dataSource from '../database/data-source';
import { Company } from '../companies/entities/company.entity';
import { AccountTypeEntity } from '../account-types/entities/account-type.entity';
import { AccountGroup } from '../account-groups/entities/account-group.entity';
import { AccountAccount } from '../account-accounts/entities/account-account.entity';
import {
  AccountInternalGroup,
  AccountTypeCategory,
} from '../account-types/enums/account-type-category.enum';
import { AccountType } from '../account-accounts/enums/account-account.enum';

async function resetAndSeed() {
  console.log('Connecting to database...');
  await dataSource.initialize();
  console.log('Database connected successfully.');

  const qr = dataSource.createQueryRunner();
  await qr.connect();

  try {
    console.log('1. Clearing existing accounting data...');
    await qr.query(`UPDATE purchase_orders SET vendor_bill_id = NULL WHERE vendor_bill_id IS NOT NULL;`).catch(() => {});
    await qr.query(`DELETE FROM vendor_bill_lines;`).catch(() => {});
    await qr.query(`DELETE FROM vendor_bills;`).catch(() => {});
    await qr.query(`DELETE FROM account_move_lines;`).catch(() => {});
    await qr.query(`DELETE FROM account_moves;`).catch(() => {});
    await qr.query(`DELETE FROM account_accounts;`).catch(() => {});
    await qr.query(`UPDATE account_groups SET parent_id = NULL;`).catch(() => {});
    await qr.query(`DELETE FROM account_groups;`).catch(() => {});
    await qr.query(`DELETE FROM account_types;`).catch(() => {});
    await qr.query(`DELETE FROM account_journals;`).catch(() => {});
    console.log('Existing accounting data cleared successfully.');

    const companyRepo = dataSource.getRepository(Company);
    const accountTypeRepo = dataSource.getRepository(AccountTypeEntity);
    const accountGroupRepo = dataSource.getRepository(AccountGroup);
    const accountRepo = dataSource.getRepository(AccountAccount);

    const companies = await companyRepo.find();
    console.log(`Found ${companies.length} company(ies) to seed default data for.`);

    for (const company of companies) {
      console.log(`Seeding accounting defaults for company: "${company.name}" (${company.id})...`);

      // 1. Primary Account Types & Roles
      const ensureType = async (
        name: string,
        type: AccountTypeCategory,
        internalGroup: AccountInternalGroup,
        includeInitialBalance = true,
        notes?: string,
      ) => {
        let existing = await accountTypeRepo.findOne({
          where: { name, companyId: company.id },
        });
        if (!existing) {
          existing = await accountTypeRepo.save(
            accountTypeRepo.create({
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

      // Primary Types
      const assetType = await ensureType('Asset', AccountTypeCategory.REGULAR, AccountInternalGroup.ASSET, true, 'Primary');
      const liabilityType = await ensureType('Liability', AccountTypeCategory.REGULAR, AccountInternalGroup.LIABILITY, true, 'Primary');
      const incomeType = await ensureType('Income', AccountTypeCategory.REGULAR, AccountInternalGroup.INCOME, false, 'Primary');
      const expenseType = await ensureType('Expense', AccountTypeCategory.REGULAR, AccountInternalGroup.EXPENSE, false, 'Primary');

      // Customer & Vendor Types
      const customerType = await ensureType('Customer', AccountTypeCategory.RECEIVABLE, AccountInternalGroup.ASSET, true, 'Customer');
      const vendorType = await ensureType('Vendor', AccountTypeCategory.PAYABLE, AccountInternalGroup.LIABILITY, true, 'Vendor');

      // 2. Account Groups
      const ensureGroup = async (
        name: string,
        codePrefix: string,
        accountTypeId: string,
        parentId?: string,
      ) => {
        let existing = await accountGroupRepo.findOne({
          where: { name, companyId: company.id },
        });
        if (!existing) {
          existing = await accountGroupRepo.save(
            accountGroupRepo.create({
              name,
              codePrefix,
              accountTypeId,
              parentId,
              companyId: company.id,
            }),
          );
        }
        return existing;
      };

      // Primary Groups
      const assetGroup = await ensureGroup('Asset', '1', assetType.id);
      const liabilityGroup = await ensureGroup('Liability', '2', liabilityType.id);
      const incomeGroup = await ensureGroup('Income', '4', incomeType.id);
      const expenseGroup = await ensureGroup('Expense', '5', expenseType.id);

      // Other Groups
      const currentAssetsGroup = await ensureGroup('Current Assets', '10', assetType.id, assetGroup.id);
      const sundryDebtorGroup = await ensureGroup('Sundry Debtor', '105', customerType.id, currentAssetsGroup.id);

      const currentLiabilitiesGroup = await ensureGroup('Current liabilities', '20', liabilityType.id, liabilityGroup.id);
      const sundryCreditorGroup = await ensureGroup('Sundry Creditor', '205', vendorType.id, currentLiabilitiesGroup.id);
      const dutiesTaxesGroup = await ensureGroup('Duties & Taxes', '206', liabilityType.id, currentLiabilitiesGroup.id);

      const salesAccountsGroup = await ensureGroup('Sales Accounts', '40', incomeType.id, incomeGroup.id);
      const purchaseAccountsGroup = await ensureGroup('Purchase Accounts', '50', expenseType.id, expenseGroup.id);

      // 3. Chart of Accounts (Basic Ledgers)
      const ensureAccount = async (
        code: string,
        name: string,
        type: AccountType,
        accountTypeId: string,
        groupId: string,
        reconcile = false,
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
              currency: 'INR',
              companyId: company.id,
            }),
          );
        }
        return existing;
      };

      // Sales Accounts
      await ensureAccount('401001', 'Local Sales @5%', AccountType.INCOME, incomeType.id, salesAccountsGroup.id, false);
      await ensureAccount('401002', 'Central Sales @5%', AccountType.INCOME, incomeType.id, salesAccountsGroup.id, false);

      // Purchase Accounts
      await ensureAccount('501001', 'Local Purchase @5%', AccountType.EXPENSE, expenseType.id, purchaseAccountsGroup.id, false);
      await ensureAccount('501002', 'Central Purchase @5%', AccountType.EXPENSE, expenseType.id, purchaseAccountsGroup.id, false);

      // Sundry Debtor
      const customerLedger = await ensureAccount('105001', 'Customer Ledger', AccountType.RECEIVABLE, customerType.id, sundryDebtorGroup.id, true);

      // Sundry Creditor
      const vendorLedger = await ensureAccount('205001', 'Vendor Ledger', AccountType.PAYABLE, vendorType.id, sundryCreditorGroup.id, true);

      // Duties & Taxes
      await ensureAccount('206001', 'CGST Sales Tax @2.5%', AccountType.TAX, liabilityType.id, dutiesTaxesGroup.id, false);
      await ensureAccount('206002', 'SGST Sales Tax @2.5%', AccountType.TAX, liabilityType.id, dutiesTaxesGroup.id, false);
      await ensureAccount('206003', 'IGST Sales Tax @5%', AccountType.TAX, liabilityType.id, dutiesTaxesGroup.id, false);
      await ensureAccount('206004', 'CGST Purchase Tax @2.5%', AccountType.TAX, liabilityType.id, dutiesTaxesGroup.id, false);
      await ensureAccount('206005', 'SGST Purchase Tax @2.5%', AccountType.TAX, liabilityType.id, dutiesTaxesGroup.id, false);
      await ensureAccount('206006', 'IGST Purchase Tax @5%', AccountType.TAX, liabilityType.id, dutiesTaxesGroup.id, false);

      await qr.query(`UPDATE partners SET account_receivable_id = $1 WHERE company_id = $2 AND account_receivable_id IS NULL`, [customerLedger.id, company.id]).catch(() => {});
      await qr.query(`UPDATE partners SET account_payable_id = $1 WHERE company_id = $2 AND account_payable_id IS NULL`, [vendorLedger.id, company.id]).catch(() => {});

      console.log(`Company "${company.name}" bootstrapped successfully!`);
    }

    // Mark reset flag
    await qr.query(`CREATE TABLE IF NOT EXISTS _accounting_reset_v4 (id serial primary key, created_at timestamp default now());`).catch(() => {});

    console.log('ALL DONE! All companies now have the exact requested default accounting data.');
  } finally {
    await qr.release();
    await dataSource.destroy();
  }
}

resetAndSeed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal error during reset and seed:', err);
    process.exit(1);
  });

