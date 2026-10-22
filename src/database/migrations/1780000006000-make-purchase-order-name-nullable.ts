import { MigrationInterface, QueryRunner } from "typeorm";

export class MakePurchaseOrderNameNullable1780000006000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "purchase_orders" ALTER COLUMN "name" DROP NOT NULL;`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "purchase_orders" ALTER COLUMN "name" SET NOT NULL;`,
    );
  }
}
