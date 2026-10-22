# Master Data API (Odoo-style) — NestJS

A REST API for the core **master data** modules found in Odoo, built with **NestJS + TypeORM + PostgreSQL**:

| Module | Odoo equivalent | Endpoint |
|---|---|---|
| Product Categories | `product.category` | `/api/v1/product-categories` |
| Units of Measure | `uom.category`, `uom.uom` | `/api/v1/uom-categories`, `/api/v1/uoms` |
| Products | `product.template` | `/api/v1/products` |
| Customers | `res.partner` (customer_rank) | `/api/v1/customers` |
| Vendors | `res.partner` (supplier_rank) | `/api/v1/vendors` |
| Partners (all) | `res.partner` | `/api/v1/partners` |
| Warehouses | `stock.warehouse` | `/api/v1/warehouses` |
| Locations | `stock.location` | `/api/v1/locations` |
| Taxes | `account.tax` | `/api/v1/taxes` |
| Payment Terms | `account.payment.term` | `/api/v1/payment-terms` |
| Pricelists | `product.pricelist` | `/api/v1/pricelists` |
| Divisions | - | `/api/v1/divisions` |
| Account Journals | `account.journal` | `/api/v1/account-journals` |
| Users & Roles | `res.users`, `res.groups` | `/api/v1/users`, `/api/v1/roles` |

### Inventory operations (Product → Warehouse → Location → Move → Quant)

| Module | Odoo equivalent | Endpoint |
|---|---|---|
| Stock Quants | `stock.quant` | `/api/v1/stock-quants` (read-only — updated automatically) |
| Stock Moves | `stock.move` | `/api/v1/stock-moves` |
| Stock Pickings (Receipt / Delivery / Internal Transfer / Return) | `stock.picking` | `/api/v1/stock-pickings` |
| Inventory Adjustments | Inventory Adjustment | `/api/v1/inventory-adjustments` |
| Inventory Valuation | `stock.valuation.layer` | `/api/v1/stock-valuation` |

### Procurement & Invoicing (Adhoc PO → Direct Vendor Bill)

| Module | Odoo equivalent | Endpoint |
|---|---|---|
| Purchase Orders | `purchase.order` | `/api/v1/purchase-orders` |
| Vendor Bills | `account.move` (`in_invoice`) | `/api/v1/vendor-bills` |

**Adhoc Direct Flow:**
1. Create PO (`POST /api/v1/purchase-orders`) with type (`adhoc`), vendor, warehouse, division, currency, order date, delivery date, lines.
2. Confirm (`PATCH /api/v1/purchase-orders/:id/confirm`) -> Sent for approval (`to_approve`).
3. Admin Approve (`PATCH /api/v1/purchase-orders/:id/approve`): Skips receipts/gate pass and directly generates the **Vendor Bill**, copying vendor details, formatted address, division, warehouse, currency, PO reference, lines, and new invoice number (`BILL/YYYY/NNNNN`).

Customers and Vendors share one underlying `partners` table (`is_customer` / `is_vendor` flags), exactly like Odoo's unified `res.partner` model — each endpoint just filters/defaults that flag.

## Stack
- NestJS 10, TypeScript
- TypeORM + PostgreSQL
- JWT auth (`@nestjs/jwt` + Passport) with a simple Role-based guard (`@Roles('admin', ...)`)
- class-validator DTOs on every write endpoint
- Swagger docs auto-generated at `/api/docs`

## Getting started

```bash
cp .env.example .env      # edit DB credentials / JWT secret
npm install
npm run start:dev         # http://localhost:3000/api/v1
```

TypeORM `synchronize` is on outside production, so tables are created automatically on first run against an empty Postgres database named in `.env` (`DB_NAME`).

### Seed default data
Creates base roles (`admin`, `sales_manager`, `purchase_manager`, `inventory_manager`, `accountant`), an admin user, and starter UoM categories/units:

```bash
npm run seed
```

Default admin login: `admin@example.com` / `Admin@123` — **change this immediately.**

### Auth
```
POST /api/v1/auth/login  { "email": "...", "password": "..." }
→ { accessToken, user }
```
Send `Authorization: Bearer <accessToken>` on subsequent requests. Every route requires a token except `/auth/login`; write routes are further restricted by role via `@Roles(...)`.

## Project layout

```
src/
  auth/                 JWT login, strategy
  users/  roles/         Users & Role-based access control
  uom/                   UomCategory + Uom (factor/rounding, mirrors Odoo ratios)
  product-category/      Hierarchical categories w/ computed complete_name
  products/               Products referencing category, UoM, sales/purchase taxes
  partners/               Shared Customer/Vendor model + 3 controllers (partners/customers/vendors)
  warehouses/  locations/ Warehouse + hierarchical stock locations (usage: internal/customer/vendor/...)
  taxes/                  Percent/fixed tax, sale/purchase scope, price-included flag
  payment-terms/          Payment term + installment lines (percent/fixed/balance, days due)
  pricelists/             Pricelist + rule items (product/category/all, fixed/percentage/formula) + live price computation endpoint
  common/                 Base entity, pagination DTO, guards, decorators, exception filter
  database/               TypeORM DataSource (for CLI/migrations) + seed script
```

Every module follows the same CRUD shape:
`POST /`, `GET /?page&limit&search&active`, `GET /:id`, `PATCH /:id`, `DELETE /:id` (soft-delete: sets `active=false`).

## Inventory operations layer

Everything above is **master data**. This layer is the **operational** stock engine built
on top of it — Products moving through Warehouses/Locations over time.

### The model
- **StockQuant** — current on-hand quantity of a product at an `internal` location. Never
  written to directly; always derived from validated moves.
- **StockMove** — the atomic unit: a quantity of one product moving from a source to a
  destination location. State machine: `draft → confirmed → done` (or `cancelled`).
  Validating a move (`done`) is the only thing that changes quants and valuation.
- **StockPicking** — a transfer document grouping one or more moves, with the same state
  machine, one level up. `pickingType` is one of:
  - `receipt` — Vendor location → an internal (Stock) location
  - `delivery` — an internal location → Customer location
  - `internal` — internal location → internal location (Internal Transfer)
  - `return` — reversal of a completed receipt or delivery
- **InventoryAdjustment** — a stock-count session. Each line snapshots the theoretical
  (system) quantity vs. what was physically counted; validating the header turns any
  difference into a corrective StockMove against a shared virtual "Inventory Adjustment"
  location, so every correction is fully auditable as a normal move.
- **StockValuationLayer** — an immutable ledger entry recording how a move changed the
  accounting value of inventory (standard costing: `quantity × product.costPrice` at the
  moment the move was validated). Only moves crossing the internal/external boundary
  (receipts, deliveries, returns, adjustment corrections) create a layer — pure internal
  transfers don't change total valuation.

### Typical flow
```
1. POST /stock-pickings           { pickingType: "receipt", sourceLocationId: <Vendors>,
                                     destLocationId: <Stock>, moves: [{ productId, quantity }] }
2. PATCH /stock-pickings/:id/confirm
3. PATCH /stock-pickings/:id/validate   -> quants + valuation updated
4. GET  /stock-quants/on-hand?productId=&locationId=
5. GET  /stock-valuation/summary
```
A Delivery or Internal Transfer follows the exact same 3-step confirm → validate flow with
different `pickingType`/locations. `POST /stock-pickings/:id/return` auto-generates the
reversing draft picking from a completed one.

An Inventory Adjustment:
```
1. POST  /inventory-adjustments        { lines: [{ productId, locationId, countedQuantity }] }
2. PATCH /inventory-adjustments/:id/lines/:lineId   (update a count before validating)
3. PATCH /inventory-adjustments/:id/validate        -> corrective moves auto-created & applied
```

### Seeded starter data
`npm run seed` now also provisions a default warehouse (`WH1`) with a standard location
tree — `Stock` (internal), `Vendors`, `Customers`, `Inventory Adjustment`, and `Transit` —
so the endpoints above work immediately without any manual location setup.

## Notable behaviors
- **Product Categories / Locations**: `completeName` is auto-computed from the parent chain on create/update (e.g. `All / Electronics / Phones`), like Odoo's `complete_name`.
- **Pricelists**: `GET /pricelists/:id/price?productId=&quantity=` resolves the applicable rule using Odoo's precedence (product-specific > category > all-products) and returns the computed price.
- **Payment Terms**: lines support `percent`, `fixed`, or `balance` value types with `daysDue` / `endOfMonth`, enough to model "30% now, 70% in 30 days" style terms.
- **Taxes**: `priceIncluded` mirrors Odoo's `price_include` for tax-inclusive pricing.

## Next steps you may want
- Swap soft-delete for real archiving/audit trail if needed.
- Add migrations (`npm run migration:generate`) instead of `synchronize` for production.
- Expand `permissions` on `Role` into a real ACL if endpoint-level granularity beyond the 5 seeded roles is required.
# vender_mobile_backend
