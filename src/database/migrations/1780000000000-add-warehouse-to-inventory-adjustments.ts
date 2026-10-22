import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableForeignKey,
} from "typeorm";

export class AddWarehouseToInventoryAdjustments1780000000000 implements MigrationInterface {
  private readonly warehouseForeignKey = "FK_inventory_adjustments_warehouse";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const adjustmentTable = await queryRunner.getTable("inventory_adjustments");
    if (!adjustmentTable?.findColumnByName("warehouse_id")) {
      await queryRunner.addColumn(
        "inventory_adjustments",
        new TableColumn({
          name: "warehouse_id",
          type: "uuid",
          isNullable: true,
        }),
      );
    }

    const updatedAdjustmentTable = await queryRunner.getTable(
      "inventory_adjustments",
    );
    if (
      !updatedAdjustmentTable?.foreignKeys.some(
        (key) => key.name === this.warehouseForeignKey,
      )
    ) {
      await queryRunner.createForeignKey(
        "inventory_adjustments",
        new TableForeignKey({
          name: this.warehouseForeignKey,
          columnNames: ["warehouse_id"],
          referencedTableName: "warehouses",
          referencedColumnNames: ["id"],
          onDelete: "RESTRICT",
        }),
      );
    }

    await queryRunner.query(
      'ALTER TABLE "inventory_adjustment_lines" ALTER COLUMN "location_id" DROP NOT NULL',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "inventory_adjustment_lines" ALTER COLUMN "location_id" SET NOT NULL',
    );

    const adjustmentTable = await queryRunner.getTable("inventory_adjustments");
    const foreignKey = adjustmentTable?.foreignKeys.find(
      (key) => key.name === this.warehouseForeignKey,
    );
    if (foreignKey) {
      await queryRunner.dropForeignKey("inventory_adjustments", foreignKey);
    }
    if (adjustmentTable?.findColumnByName("warehouse_id")) {
      await queryRunner.dropColumn("inventory_adjustments", "warehouse_id");
    }
  }
}
