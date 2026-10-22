import { MigrationInterface, QueryRunner, Table, TableColumn } from "typeorm";

export class CreateDoubleEntryAccounting1780000005000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasAccounts = await queryRunner.hasTable("account_accounts");
    if (!hasAccounts) {
      await queryRunner.createTable(
        new Table({
          name: "account_accounts",
          columns: [
            {
              name: "id",
              type: "uuid",
              isPrimary: true,
              isGenerated: true,
              generationStrategy: "uuid",
            },
            { name: "code", type: "character varying", isUnique: true },
            { name: "name", type: "character varying" },
            {
              name: "type",
              type: "character varying",
              default: "'expense'",
            },
            { name: "reconcile", type: "boolean", default: false },
            { name: "active", type: "boolean", default: true },
            { name: "created_at", type: "timestamp", default: "now()" },
            { name: "updated_at", type: "timestamp", default: "now()" },
          ],
        }),
      );

      // Seed core chart of accounts
      await queryRunner.query(`
        INSERT INTO account_accounts (code, name, type, reconcile) VALUES
        ('211000', 'Accounts Payable (Sundry Creditors)', 'payable', true),
        ('112000', 'Accounts Receivable (Sundry Debtors)', 'receivable', true),
        ('500000', 'Operating Expenses / Purchases', 'expense', false),
        ('131000', 'Input Tax Credit (GST/VAT)', 'tax', false),
        ('101000', 'Bank Account', 'bank', false),
        ('102000', 'Cash Account', 'cash', false)
        ON CONFLICT (code) DO NOTHING;
      `);
    }

    const hasMoves = await queryRunner.hasTable("account_moves");
    if (!hasMoves) {
      await queryRunner.createTable(
        new Table({
          name: "account_moves",
          columns: [
            {
              name: "id",
              type: "uuid",
              isPrimary: true,
              isGenerated: true,
              generationStrategy: "uuid",
            },
            { name: "name", type: "character varying", isUnique: true },
            {
              name: "date",
              type: "timestamp",
              default: "CURRENT_TIMESTAMP",
            },
            { name: "ref", type: "character varying", isNullable: true },
            { name: "journal_id", type: "uuid" },
            { name: "partner_id", type: "uuid", isNullable: true },
            {
              name: "move_type",
              type: "character varying",
              default: "'entry'",
            },
            {
              name: "state",
              type: "character varying",
              default: "'draft'",
            },
            {
              name: "amount",
              type: "decimal",
              precision: 12,
              scale: 4,
              default: 0,
            },
            { name: "active", type: "boolean", default: true },
            { name: "created_at", type: "timestamp", default: "now()" },
            { name: "updated_at", type: "timestamp", default: "now()" },
          ],
        }),
      );
    }

    const hasMoveLines = await queryRunner.hasTable("account_move_lines");
    if (!hasMoveLines) {
      await queryRunner.createTable(
        new Table({
          name: "account_move_lines",
          columns: [
            {
              name: "id",
              type: "uuid",
              isPrimary: true,
              isGenerated: true,
              generationStrategy: "uuid",
            },
            { name: "move_id", type: "uuid" },
            { name: "account_id", type: "uuid" },
            { name: "partner_id", type: "uuid", isNullable: true },
            { name: "name", type: "character varying", isNullable: true },
            {
              name: "debit",
              type: "decimal",
              precision: 12,
              scale: 4,
              default: 0,
            },
            {
              name: "credit",
              type: "decimal",
              precision: 12,
              scale: 4,
              default: 0,
            },
            { name: "reconciled", type: "boolean", default: false },
            { name: "matched_line_id", type: "uuid", isNullable: true },
            { name: "active", type: "boolean", default: true },
            { name: "created_at", type: "timestamp", default: "now()" },
            { name: "updated_at", type: "timestamp", default: "now()" },
          ],
        }),
      );
    }

    // Add columns to vendor_bills if not already present
    const hasVendorBills = await queryRunner.hasTable("vendor_bills");
    if (hasVendorBills) {
      const table = await queryRunner.getTable("vendor_bills");
      if (table && !table.findColumnByName("journal_id")) {
        await queryRunner.addColumn(
          "vendor_bills",
          new TableColumn({
            name: "journal_id",
            type: "uuid",
            isNullable: true,
          }),
        );
      }
      if (table && !table.findColumnByName("account_move_id")) {
        await queryRunner.addColumn(
          "vendor_bills",
          new TableColumn({
            name: "account_move_id",
            type: "uuid",
            isNullable: true,
          }),
        );
      }
      if (table && !table.findColumnByName("residual_amount")) {
        await queryRunner.addColumn(
          "vendor_bills",
          new TableColumn({
            name: "residual_amount",
            type: "decimal",
            precision: 12,
            scale: 4,
            default: 0,
          }),
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("account_move_lines", true, true, true);
    await queryRunner.dropTable("account_moves", true, true, true);
    await queryRunner.dropTable("account_accounts", true, true, true);
  }
}
