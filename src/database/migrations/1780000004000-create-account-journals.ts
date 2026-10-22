import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreateAccountJournals1780000004000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable("account_journals");
    if (!hasTable) {
      await queryRunner.createTable(
        new Table({
          name: "account_journals",
          columns: [
            {
              name: "id",
              type: "uuid",
              isPrimary: true,
              isGenerated: true,
              generationStrategy: "uuid",
            },
            { name: "name", type: "character varying" },
            {
              name: "type",
              type: "character varying",
              default: "'general'",
            },
            { name: "code", type: "character varying", isUnique: true },
            { name: "active", type: "boolean", default: true },
            { name: "created_at", type: "timestamp", default: "now()" },
            { name: "updated_at", type: "timestamp", default: "now()" },
          ],
        }),
      );

      // Seed initial 4 standard journals requested by user
      await queryRunner.query(`
        INSERT INTO account_journals (name, type, code) VALUES
        ('Vendor Bills', 'purchase', 'BILL'),
        ('Customer Invoices', 'sale', 'INV'),
        ('Bank Account', 'bank', 'BNK'),
        ('Cash', 'cash', 'CSH')
        ON CONFLICT (code) DO NOTHING;
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasTable = await queryRunner.hasTable("account_journals");
    if (hasTable) {
      await queryRunner.dropTable("account_journals");
    }
  }
}
