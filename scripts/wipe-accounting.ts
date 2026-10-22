import "reflect-metadata";
import dataSource from "../src/database/data-source";

async function wipeAccountingData() {
  console.log("🔌 Connecting to database...");
  const ds = await dataSource.initialize();
  const queryRunner = ds.createQueryRunner();
  await queryRunner.connect();

  console.log("🧹 Starting accounting data cleanup...");

  try {
    // 1. Unlink vendor bills from purchase orders
    await queryRunner.query(
      `UPDATE purchase_orders SET vendor_bill_id = NULL WHERE vendor_bill_id IS NOT NULL;`
    );
    console.log("✅ Unlinked purchase_orders.vendor_bill_id");

    // 2. Delete Vendor Bill Lines
    await queryRunner.query(`DELETE FROM vendor_bill_lines;`);
    console.log("✅ Cleared vendor_bill_lines");

    // 3. Delete Vendor Bills
    await queryRunner.query(`DELETE FROM vendor_bills;`);
    console.log("✅ Cleared vendor_bills");

    // 4. Delete Account Move Lines
    await queryRunner.query(`DELETE FROM account_move_lines;`);
    console.log("✅ Cleared account_move_lines");

    // 5. Delete Account Moves
    await queryRunner.query(`DELETE FROM account_moves;`);
    console.log("✅ Cleared account_moves");

    // 6. Delete Chart of Accounts (account_accounts)
    await queryRunner.query(`DELETE FROM account_accounts;`);
    console.log("✅ Cleared account_accounts (Chart of Accounts)");

    // 7. Delete Account Groups
    // Account groups can have self-referencing parent_id
    await queryRunner.query(`UPDATE account_groups SET parent_id = NULL;`);
    await queryRunner.query(`DELETE FROM account_groups;`);
    console.log("✅ Cleared account_groups");

    // 8. Delete Account Types
    await queryRunner.query(`DELETE FROM account_types;`);
    console.log("✅ Cleared account_types");

    // 9. Delete Account Journals (if user wants clean slate)
    await queryRunner.query(`DELETE FROM account_journals;`).catch(() => {});
    console.log("✅ Cleared account_journals");

    // 10. Drop reset flags so auto-bootstrap triggers cleanly
    await queryRunner.query(`DROP TABLE IF EXISTS _accounting_reset_v3;`).catch(() => {});
    await queryRunner.query(`DROP TABLE IF EXISTS _accounting_reset_v2;`).catch(() => {});

    console.log("🎉 All accounting data has been successfully wiped!");
  } catch (err) {
    console.error("❌ Error while wiping accounting data:", err);
    throw err;
  } finally {
    await queryRunner.release();
    await ds.destroy();
  }
}

wipeAccountingData().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
