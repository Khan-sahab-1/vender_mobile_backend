import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreateProcurementAndVendorBills1780000003000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasVendorBills = await queryRunner.hasTable("vendor_bills");
    if (!hasVendorBills) {
      await queryRunner.createTable(
        new Table({
          name: "vendor_bills",
          columns: [
            {
              name: "id",
              type: "uuid",
              isPrimary: true,
              isGenerated: true,
              generationStrategy: "uuid",
            },
            { name: "bill_number", type: "character varying", isUnique: true },
            { name: "vendor_id", type: "uuid" },
            { name: "vendor_name", type: "character varying", isNullable: true },
            { name: "vendor_address", type: "text", isNullable: true },
            { name: "warehouse_id", type: "uuid", isNullable: true },
            { name: "division_id", type: "uuid", isNullable: true },
            { name: "currency", type: "character varying", default: "'INR'" },
            {
              name: "invoice_date",
              type: "timestamp",
              default: "CURRENT_TIMESTAMP",
            },
            { name: "due_date", type: "timestamp", isNullable: true },
            {
              name: "source_document",
              type: "character varying",
              isNullable: true,
            },
            { name: "purchase_order_id", type: "uuid", isNullable: true },
            {
              name: "state",
              type: "character varying",
              default: "'posted'",
            },
            {
              name: "amount_untaxed",
              type: "decimal",
              precision: 12,
              scale: 4,
              default: 0,
            },
            {
              name: "amount_tax",
              type: "decimal",
              precision: 12,
              scale: 4,
              default: 0,
            },
            {
              name: "amount_total",
              type: "decimal",
              precision: 12,
              scale: 4,
              default: 0,
            },
            { name: "notes", type: "text", isNullable: true },
            { name: "active", type: "boolean", default: true },
            { name: "created_at", type: "timestamp", default: "now()" },
            { name: "updated_at", type: "timestamp", default: "now()" },
          ],
        }),
      );
    }

    const hasVendorBillLines = await queryRunner.hasTable("vendor_bill_lines");
    if (!hasVendorBillLines) {
      await queryRunner.createTable(
        new Table({
          name: "vendor_bill_lines",
          columns: [
            {
              name: "id",
              type: "uuid",
              isPrimary: true,
              isGenerated: true,
              generationStrategy: "uuid",
            },
            { name: "bill_id", type: "uuid" },
            { name: "product_id", type: "uuid", isNullable: true },
            { name: "description", type: "character varying", isNullable: true },
            {
              name: "quantity",
              type: "decimal",
              precision: 12,
              scale: 4,
              default: 1,
            },
            {
              name: "unit_price",
              type: "decimal",
              precision: 12,
              scale: 4,
              default: 0,
            },
            { name: "uom_id", type: "uuid", isNullable: true },
            { name: "tax_id", type: "uuid", isNullable: true },
            {
              name: "tax_amount",
              type: "decimal",
              precision: 12,
              scale: 4,
              default: 0,
            },
            {
              name: "subtotal",
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

    const hasPurchaseOrders = await queryRunner.hasTable("purchase_orders");
    if (!hasPurchaseOrders) {
      await queryRunner.createTable(
        new Table({
          name: "purchase_orders",
          columns: [
            {
              name: "id",
              type: "uuid",
              isPrimary: true,
              isGenerated: true,
              generationStrategy: "uuid",
            },
            { name: "name", type: "character varying", isUnique: true, isNullable: true },
            { name: "type", type: "character varying", default: "'adhoc'" },
            { name: "vendor_id", type: "uuid" },
            { name: "warehouse_id", type: "uuid" },
            { name: "division_id", type: "uuid" },
            { name: "currency", type: "character varying", default: "'INR'" },
            {
              name: "order_date",
              type: "timestamp",
              default: "CURRENT_TIMESTAMP",
            },
            { name: "delivery_date", type: "timestamp", isNullable: true },
            { name: "state", type: "character varying", default: "'draft'" },
            {
              name: "amount_untaxed",
              type: "decimal",
              precision: 12,
              scale: 4,
              default: 0,
            },
            {
              name: "amount_tax",
              type: "decimal",
              precision: 12,
              scale: 4,
              default: 0,
            },
            {
              name: "amount_total",
              type: "decimal",
              precision: 12,
              scale: 4,
              default: 0,
            },
            { name: "vendor_bill_id", type: "uuid", isNullable: true },
            { name: "notes", type: "text", isNullable: true },
            { name: "rejection_reason", type: "text", isNullable: true },
            { name: "active", type: "boolean", default: true },
            { name: "created_at", type: "timestamp", default: "now()" },
            { name: "updated_at", type: "timestamp", default: "now()" },
          ],
        }),
      );
    }

    const hasPurchaseOrderLines = await queryRunner.hasTable(
      "purchase_order_lines",
    );
    if (!hasPurchaseOrderLines) {
      await queryRunner.createTable(
        new Table({
          name: "purchase_order_lines",
          columns: [
            {
              name: "id",
              type: "uuid",
              isPrimary: true,
              isGenerated: true,
              generationStrategy: "uuid",
            },
            { name: "order_id", type: "uuid" },
            { name: "product_id", type: "uuid", isNullable: true },
            { name: "description", type: "character varying", isNullable: true },
            {
              name: "quantity",
              type: "decimal",
              precision: 12,
              scale: 4,
              default: 1,
            },
            {
              name: "unit_price",
              type: "decimal",
              precision: 12,
              scale: 4,
              default: 0,
            },
            { name: "uom_id", type: "uuid", isNullable: true },
            { name: "tax_id", type: "uuid", isNullable: true },
            {
              name: "tax_amount",
              type: "decimal",
              precision: 12,
              scale: 4,
              default: 0,
            },
            {
              name: "subtotal",
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
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("purchase_order_lines", true, true, true);
    await queryRunner.dropTable("purchase_orders", true, true, true);
    await queryRunner.dropTable("vendor_bill_lines", true, true, true);
    await queryRunner.dropTable("vendor_bills", true, true, true);
  }
}
