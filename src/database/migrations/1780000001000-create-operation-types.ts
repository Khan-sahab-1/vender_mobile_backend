import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableForeignKey,
} from "typeorm";

export class CreateOperationTypes1780000001000 implements MigrationInterface {
  private readonly pickingOperationTypeForeignKey =
    "FK_stock_pickings_operation_type";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasOperationTypes = await queryRunner.hasTable("operation_types");
    if (!hasOperationTypes) {
      await queryRunner.createTable(
        new Table({
          name: "operation_types",
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
              name: "picking_type",
              type: "enum",
              enum: ["receipt", "delivery", "internal", "return"],
              enumName: "operation_types_picking_type_enum",
            },
            { name: "warehouse_id", type: "uuid" },
            { name: "default_source_location_id", type: "uuid" },
            { name: "default_dest_location_id", type: "uuid" },
            { name: "sequence_prefix", type: "character varying" },
            { name: "active", type: "boolean", default: true },
            { name: "created_at", type: "timestamp", default: "now()" },
            { name: "updated_at", type: "timestamp", default: "now()" },
          ],
          foreignKeys: [
            {
              columnNames: ["warehouse_id"],
              referencedTableName: "warehouses",
              referencedColumnNames: ["id"],
              onDelete: "RESTRICT",
            },
            {
              columnNames: ["default_source_location_id"],
              referencedTableName: "locations",
              referencedColumnNames: ["id"],
              onDelete: "RESTRICT",
            },
            {
              columnNames: ["default_dest_location_id"],
              referencedTableName: "locations",
              referencedColumnNames: ["id"],
              onDelete: "RESTRICT",
            },
          ],
        }),
      );
    }

    const stockPickings = await queryRunner.getTable("stock_pickings");
    if (!stockPickings?.findColumnByName("operation_type_id")) {
      await queryRunner.addColumn(
        "stock_pickings",
        new TableColumn({
          name: "operation_type_id",
          type: "uuid",
          isNullable: true,
        }),
      );
    }
    const updatedStockPickings = await queryRunner.getTable("stock_pickings");
    if (
      !updatedStockPickings?.foreignKeys.some(
        (key) => key.name === this.pickingOperationTypeForeignKey,
      )
    ) {
      await queryRunner.createForeignKey(
        "stock_pickings",
        new TableForeignKey({
          name: this.pickingOperationTypeForeignKey,
          columnNames: ["operation_type_id"],
          referencedTableName: "operation_types",
          referencedColumnNames: ["id"],
          onDelete: "SET NULL",
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const stockPickings = await queryRunner.getTable("stock_pickings");
    const foreignKey = stockPickings?.foreignKeys.find(
      (key) => key.name === this.pickingOperationTypeForeignKey,
    );
    if (foreignKey)
      await queryRunner.dropForeignKey("stock_pickings", foreignKey);
    if (stockPickings?.findColumnByName("operation_type_id")) {
      await queryRunner.dropColumn("stock_pickings", "operation_type_id");
    }
    if (await queryRunner.hasTable("operation_types")) {
      await queryRunner.dropTable("operation_types", true);
    }
  }
}
