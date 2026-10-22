import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreateDivisions1780000002000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasDivisions = await queryRunner.hasTable("divisions");
    if (!hasDivisions) {
      await queryRunner.createTable(
        new Table({
          name: "divisions",
          columns: [
            {
              name: "id",
              type: "uuid",
              isPrimary: true,
              isGenerated: true,
              generationStrategy: "uuid",
            },
            { name: "name", type: "character varying" },
            { name: "code", type: "character varying", isUnique: true },
            { name: "active", type: "boolean", default: true },
            { name: "created_at", type: "timestamp", default: "now()" },
            { name: "updated_at", type: "timestamp", default: "now()" },
          ],
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasDivisions = await queryRunner.hasTable("divisions");
    if (hasDivisions) {
      await queryRunner.dropTable("divisions");
    }
  }
}

