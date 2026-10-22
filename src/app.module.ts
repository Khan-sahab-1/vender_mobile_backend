import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { APP_FILTER, APP_GUARD } from "@nestjs/core";

import { CompaniesModule } from "./companies/companies.module";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { UomModule } from "./uom/uom.module";
import { ProductCategoryModule } from "./product-category/product-category.module";
import { ProductsModule } from "./products/products.module";
import { PartnersModule } from "./partners/partners.module";
import { WarehousesModule } from "./warehouses/warehouses.module";
import { LocationsModule } from "./locations/locations.module";
import { TaxesModule } from "./taxes/taxes.module";
import { PaymentTermsModule } from "./payment-terms/payment-terms.module";
import { PricelistsModule } from "./pricelists/pricelists.module";
import { DivisionsModule } from "./divisions/divisions.module";
import { StockQuantsModule } from "./stock-quants/stock-quants.module";
import { StockMovesModule } from "./stock-moves/stock-moves.module";
import { StockPickingsModule } from "./stock-pickings/stock-pickings.module";
import { InventoryAdjustmentsModule } from "./inventory-adjustments/inventory-adjustments.module";
import { StockValuationModule } from "./stock-valuation/stock-valuation.module";
import { OperationTypesModule } from "./operation-types/operation-types.module";
import { VendorBillsModule } from "./vendor-bills/vendor-bills.module";
import { PurchaseOrdersModule } from "./purchase-orders/purchase-orders.module";
import { CustomerInvoicesModule } from "./customer-invoices/customer-invoices.module";
// import { OdooModule } from "./odoo/odoo.module";
import { VendorPortalModule } from "./vendor-portal/vendor-portal.module";
import { SalesModule } from "./sales/sales.module";
import { AccountJournalsModule } from "./account-journals/account-journals.module";
import { AccountAccountsModule } from "./account-accounts/account-accounts.module";
import { AccountMovesModule } from "./account-moves/account-moves.module";
import { AccountTypesModule } from "./account-types/account-types.module";
import { AccountGroupsModule } from "./account-groups/account-groups.module";
import { BankAccountsModule } from "./bank-accounts/bank-accounts.module";

import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { RolesGuard } from "./common/guards/roles.guard";
import { AllExceptionsFilter } from "./common/filters/http-exception.filter";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: "postgres",
        host: config.get<string>("DB_HOST", "localhost"),
        port: config.get<number>("DB_PORT", 5432),
        username: config.get<string>("DB_USERNAME", "postgres"),
        password: config.get<string>("DB_PASSWORD", "postgres"),
        database: config.get<string>("DB_NAME", "master_data_db"),
        autoLoadEntities: true,
        synchronize: config.get<string>("NODE_ENV") !== "production",
      }),
    }),

    // Master data domain modules
    CompaniesModule,
    AuthModule,
    UsersModule,
    UomModule,
    ProductCategoryModule,
    ProductsModule,
    PartnersModule,
    WarehousesModule,
    LocationsModule,
    TaxesModule,
    PaymentTermsModule,
    PricelistsModule,
    DivisionsModule,
    AccountJournalsModule,
    AccountAccountsModule,
    AccountMovesModule,
    AccountTypesModule,
    AccountGroupsModule,
    BankAccountsModule,

    // Inventory operations: Product -> Warehouse -> Location -> Move -> Quant
    StockQuantsModule,
    StockMovesModule,
    StockPickingsModule,
    InventoryAdjustmentsModule,
    StockValuationModule,
    OperationTypesModule,

    // Procurement & Vendor Invoicing
    VendorBillsModule,
    PurchaseOrdersModule,
    CustomerInvoicesModule,

    // Vendor Portal (Local) & Sales
    // OdooModule, (Disabled)
    VendorPortalModule,
    SalesModule,
  ],
  providers: [
    // Every route requires a valid JWT unless annotated with @Public()
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // Then, routes annotated with @Roles(...) are checked against the user's role
    { provide: APP_GUARD, useClass: RolesGuard },
    // Uniform error responses across the whole API
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
