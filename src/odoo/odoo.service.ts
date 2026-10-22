import {
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import * as bcrypt from "bcrypt";
import { Partner } from "../partners/entities/partner.entity";
import { Role } from "../roles/entities/role.entity";
import { User } from "../users/entities/user.entity";

@Injectable()
export class OdooService {
  private readonly logger = new Logger(OdooService.name);
  private cachedUid: number | null = null;

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(Partner)
    private readonly partnerRepo: Repository<Partner>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
  ) {}

  /**
   * Generic JSON-RPC caller to Odoo
   */
  async callOdoo(service: string, method: string, args: any[]): Promise<any> {
    const odooUrl = this.config.get<string>("ODOO_URL", "http://192.168.1.6:8070");
    const endpoint = `${odooUrl.replace(/\/$/, "")}/jsonrpc`;

    const body = {
      jsonrpc: "2.0",
      method: "call",
      params: {
        service,
        method,
        args,
      },
    };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        throw new Error(`Odoo request failed: ${res.status} ${res.statusText}`);
      }

      const data: any = await res.json();
      if (data.error) {
        const errMsg =
          data.error.data?.message ||
          data.error.message ||
          JSON.stringify(data.error);
        throw new Error(`Odoo Error: ${errMsg}`);
      }

      return data.result;
    } catch (err: any) {
      this.logger.error(`Odoo call error: ${err.message}`);
      throw err;
    }
  }

  /**
   * Authenticate with Odoo and retrieve UID
   */
  async getUid(): Promise<number> {
    if (this.cachedUid) return this.cachedUid;

    const db = this.config.get<string>("ODOO_DB", "current_db");
    const username = this.config.get<string>("ODOO_USERNAME", "admin@admin.com");
    const password = this.config.get<string>("ODOO_PASSWORD", "a");

    const uid = await this.callOdoo("common", "authenticate", [
      db,
      username,
      password,
      {},
    ]);

    if (!uid || typeof uid !== "number") {
      throw new Error("Odoo authentication failed. Check credentials in .env");
    }

    this.cachedUid = uid;
    this.logger.log(`Authenticated with Odoo successfully. UID: ${uid}`);
    return uid;
  }

  /**
   * Execute model method on Odoo (execute_kw)
   */
  async executeKw(
    model: string,
    method: string,
    args: any[],
    kwargs: any = {},
  ): Promise<any> {
    const uid = await this.getUid();
    const db = this.config.get<string>("ODOO_DB", "current_db");
    const password = this.config.get<string>("ODOO_PASSWORD", "a");

    return this.callOdoo("object", "execute_kw", [
      db,
      uid,
      password,
      model,
      method,
      args,
      kwargs,
    ]);
  }

  /**
   * Check connection status
   */
  async getStatus(): Promise<any> {
    try {
      const uid = await this.getUid();
      const odooUrl = this.config.get<string>("ODOO_URL");
      const db = this.config.get<string>("ODOO_DB");
      return {
        connected: true,
        odooUrl,
        database: db,
        uid,
      };
    } catch (err: any) {
      return {
        connected: false,
        error: err.message,
      };
    }
  }

  /**
   * Sync suppliers from Odoo into local DB and create Vendor login accounts
   */
  async syncVendors(): Promise<{ totalSynced: number; vendors: any[] }> {
    this.logger.log("Fetching suppliers from Odoo (res.partner supplier=true)...");

    const odooSuppliers = await this.executeKw(
      "res.partner",
      "search_read",
      [[["supplier", "=", true]]],
      {
        fields: [
          "id",
          "name",
          "email",
          "phone",
          "mobile",
          "vat",
          "street",
          "city",
        ],
        limit: 150,
      },
    );

    // Ensure 'vendor' role exists in DB
    let vendorRole = await this.roleRepo.findOne({ where: { name: "vendor" } });
    if (!vendorRole) {
      vendorRole = this.roleRepo.create({
        name: "vendor",
        description: "Vendor portal user with access to their own orders and bills",
        permissions: ["vendor-portal:read", "vendor-portal:write"],
      });
      vendorRole = await this.roleRepo.save(vendorRole);
    }

    const defaultHashedPassword = await bcrypt.hash("vendor123", 10);
    const syncedVendors: any[] = [];

    for (const sup of odooSuppliers) {
      // Find or create Partner in our database
      let partner = await this.partnerRepo.findOne({
        where: [{ odooPartnerId: sup.id }, { name: sup.name }],
      });

      const partnerEmail =
        sup.email && typeof sup.email === "string" && sup.email.includes("@")
          ? sup.email.trim()
          : `vendor_${sup.id}@vendorportal.local`;

      const partnerPhone =
        (typeof sup.phone === "string" ? sup.phone : "") ||
        (typeof sup.mobile === "string" ? sup.mobile : "") ||
        null;

      const partnerGstin =
        sup.vat && typeof sup.vat === "string" ? sup.vat.trim() : null;
      if (!partner) {
        partner = this.partnerRepo.create({
          odooPartnerId: sup.id,
          name: sup.name,
          email: partnerEmail,
          phone: partnerPhone,
          mobile: typeof sup.mobile === "string" ? sup.mobile : null,
          hasGstin: !!partnerGstin,
          gstin: partnerGstin,
          street: typeof sup.street === "string" ? sup.street : null,
          city: typeof sup.city === "string" ? sup.city : null,
          isVendor: true,
          isCompany: true,
        });
      } else {
        partner.odooPartnerId = sup.id;
        partner.isVendor = true;
        if (!partner.email) partner.email = partnerEmail;
        if (!partner.phone && partnerPhone) partner.phone = partnerPhone;
        if (!partner.gstin && partnerGstin) {
          partner.hasGstin = true;
          partner.gstin = partnerGstin;
        }
        if (!partner.street && typeof sup.street === "string")
          partner.street = sup.street;
        if (!partner.city && typeof sup.city === "string")
          partner.city = sup.city;
      }
      partner = await this.partnerRepo.save(partner);

      // Create / link User account for this vendor
      let user = await this.userRepo.findOne({
        where: [{ partnerId: partner.id }, { email: partnerEmail }],
      });

      if (!user) {
        user = this.userRepo.create({
          name: sup.name,
          email: partnerEmail,
          password: defaultHashedPassword,
          phone: partnerPhone,
          roleId: vendorRole.id,
          partnerId: partner.id,
        });
        await this.userRepo.save(user);
      } else {
        if (!user.partnerId || user.roleId !== vendorRole.id) {
          user.partnerId = partner.id;
          user.roleId = vendorRole.id;
          await this.userRepo.save(user);
        }
      }

      syncedVendors.push({
        id: partner.id,
        odooId: sup.id,
        name: partner.name,
        email: user.email,
        phone: partner.phone,
        gstin: partner.gstin,
        loginCredentials: {
          email: user.email,
          defaultPassword: "vendor123",
        },
      });
    }

    this.logger.log(`Successfully synced ${syncedVendors.length} vendors from Odoo.`);
    return {
      totalSynced: syncedVendors.length,
      vendors: syncedVendors,
    };
  }

  /**
   * Fetch purchase orders for a vendor from Odoo
   */
  async getVendorPurchaseOrders(odooPartnerId: number): Promise<any[]> {
    const orders = await this.executeKw(
      "purchase.order",
      "search_read",
      [[["partner_id", "=", odooPartnerId]]],
      {
        fields: [
          "id",
          "name",
          "partner_id",
          "state",
          "date_order",
          "date_planned",
          "amount_untaxed",
          "amount_tax",
          "amount_total",
          "order_line",
        ],
        order: "date_order desc, id desc",
      },
    );

    return orders || [];
  }

  /**
   * Fetch bills for a vendor from Odoo
   */
  async getVendorBills(odooPartnerId: number): Promise<any[]> {
    const bills = await this.executeKw(
      "account.invoice",
      "search_read",
      [[["partner_id", "=", odooPartnerId], ["type", "=", "in_invoice"]]],
      {
        fields: [
          "id",
          "number",
          "reference",
          "state",
          "date_invoice",
          "date_due",
          "amount_untaxed",
          "amount_tax",
          "amount_total",
          "residual",
        ],
        order: "date_invoice desc, id desc",
      },
    );

    return bills || [];
  }

  /**
   * Fetch single purchase order with lines from Odoo
   */
  async getPurchaseOrderDetails(poId: number): Promise<any> {
    const orders = await this.executeKw(
      "purchase.order",
      "search_read",
      [[["id", "=", poId]]],
      {
        fields: [
          "id",
          "name",
          "partner_id",
          "state",
          "date_order",
          "date_planned",
          "amount_untaxed",
          "amount_tax",
          "amount_total",
          "notes",
          "order_line",
        ],
      },
    );

    if (!orders || orders.length === 0) {
      throw new NotFoundException(`Purchase Order #${poId} not found in Odoo`);
    }

    const order = orders[0];
    if (order.order_line && order.order_line.length > 0) {
      const lines = await this.executeKw(
        "purchase.order.line",
        "search_read",
        [[["id", "in", order.order_line]]],
        {
          fields: [
            "id",
            "name",
            "product_id",
            "product_qty",
            "price_unit",
            "price_subtotal",
            "price_total",
            "price_tax",
            "product_uom",
          ],
        },
      );
      order.lines = lines;
    } else {
      order.lines = [];
    }

    return order;
  }

  /**
   * Fetch single bill with lines from Odoo
   */
  async getBillDetails(billId: number): Promise<any> {
    const bills = await this.executeKw(
      "account.invoice",
      "search_read",
      [[["id", "=", billId]]],
      {
        fields: [
          "id",
          "number",
          "reference",
          "partner_id",
          "state",
          "date_invoice",
          "date_due",
          "amount_untaxed",
          "amount_tax",
          "amount_total",
          "residual",
          "invoice_line_ids",
        ],
      },
    );

    if (!bills || bills.length === 0) {
      throw new NotFoundException(`Vendor Bill #${billId} not found in Odoo`);
    }

    const bill = bills[0];
    if (bill.invoice_line_ids && bill.invoice_line_ids.length > 0) {
      const lines = await this.executeKw(
        "account.invoice.line",
        "search_read",
        [[["id", "in", bill.invoice_line_ids]]],
        {
          fields: [
            "id",
            "name",
            "product_id",
            "quantity",
            "price_unit",
            "price_subtotal",
            "uom_id",
          ],
        },
      );
      bill.lines = lines;
    } else {
      bill.lines = [];
    }

    return bill;
  }

  /**
   * Get available databases from Odoo
   */
  async getDatabases(serverUrl?: string): Promise<string[]> {
    const url = (
      serverUrl || this.config.get<string>("ODOO_URL", "http://192.168.1.6:8070")
    ).replace(/\/$/, "");

    try {
      const res = await fetch(`${url}/jsonrpc`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "call",
          params: { service: "db", method: "list", args: [] },
        }),
      });
      const data: any = await res.json();
      if (data.result && Array.isArray(data.result)) {
        return data.result;
      }
      return ["current_db"];
    } catch (err: any) {
      this.logger.warn(`Could not fetch Odoo databases: ${err.message}`);
      return ["current_db"];
    }
  }

  /**
   * Direct User Authentication against Odoo ERP
   */
  async authenticateUser(
    serverUrl?: string,
    database?: string,
    username?: string,
    password?: string,
  ): Promise<{ uid: number; db: string; serverUrl: string; userDetails: any }> {
    const url = (
      serverUrl || this.config.get<string>("ODOO_URL", "http://192.168.1.6:8070")
    ).replace(/\/$/, "");
    const db = database || this.config.get<string>("ODOO_DB", "current_db");
    const uName = username || this.config.get<string>("ODOO_USERNAME", "admin@admin.com");
    const pwd = password || this.config.get<string>("ODOO_PASSWORD", "a");

    const res = await fetch(`${url}/jsonrpc`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "call",
        params: {
          service: "common",
          method: "authenticate",
          args: [db, uName, pwd, {}],
        },
      }),
    });

    if (!res.ok) {
      throw new Error(`Odoo connection failed: ${res.statusText}`);
    }

    const data: any = await res.json();
    if (data.error) {
      throw new Error(
        data.error.data?.message || data.error.message || "Odoo Auth Error",
      );
    }

    const uid = data.result;
    if (!uid || typeof uid !== "number") {
      throw new Error("Invalid Odoo username or password.");
    }

    let userDetails: any = null;
    try {
      const userRes = await fetch(`${url}/jsonrpc`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "call",
          params: {
            service: "object",
            method: "execute_kw",
            args: [
              db,
              uid,
              pwd,
              "res.users",
              "read",
              [[uid]],
              { fields: ["id", "name", "login", "email", "company_id", "partner_id"] },
            ],
          },
        }),
      });
      const uData: any = await userRes.json();
      if (uData.result && uData.result.length > 0) {
        userDetails = uData.result[0];
      }
    } catch (err: any) {
      this.logger.warn(`Could not read Odoo user profile: ${err.message}`);
    }

    return {
      uid,
      db,
      serverUrl: url,
      userDetails: userDetails || { id: uid, name: uName, login: uName, email: uName },
    };
  }

  /**
   * Fetch Sales Orders (SO) from Odoo
   */
  async getSalesOrders(filters: { search?: string; state?: string; limit?: number } = {}): Promise<any[]> {
    const domain: any[] = [];
    if (filters.state && filters.state !== "all") {
      domain.push(["state", "=", filters.state]);
    }
    if (filters.search && filters.search.trim()) {
      const s = filters.search.trim();
      domain.push("|", ["name", "ilike", s], ["partner_id", "ilike", s]);
    }

    const orders = await this.executeKw(
      "sale.order",
      "search_read",
      [domain],
      {
        fields: [
          "id",
          "name",
          "partner_id",
          "date_order",
          "amount_untaxed",
          "amount_tax",
          "amount_total",
          "state",
          "invoice_status",
          "user_id",
          "client_order_ref",
        ],
        limit: filters.limit || 50,
        order: "date_order desc, id desc",
      },
    );

    return orders.map((so: any) => ({
      id: so.id,
      soNumber: so.name,
      customer: Array.isArray(so.partner_id) ? so.partner_id[1] : "Unknown Customer",
      customerId: Array.isArray(so.partner_id) ? so.partner_id[0] : null,
      salesperson: Array.isArray(so.user_id) ? so.user_id[1] : null,
      date: so.date_order,
      state: so.state,
      invoiceStatus: so.invoice_status,
      untaxedAmount: Number(so.amount_untaxed || 0),
      taxAmount: Number(so.amount_tax || 0),
      totalAmount: Number(so.amount_total || 0),
      clientRef: so.client_order_ref || null,
    }));
  }

  /**
   * Fetch Sales Order detail with line items
   */
  async getSalesOrderDetail(orderId: number): Promise<any> {
    const orders = await this.executeKw(
      "sale.order",
      "read",
      [[orderId]],
      {
        fields: [
          "id",
          "name",
          "partner_id",
          "partner_invoice_id",
          "partner_shipping_id",
          "date_order",
          "validity_date",
          "payment_term_id",
          "amount_untaxed",
          "amount_tax",
          "amount_total",
          "state",
          "invoice_status",
          "user_id",
          "team_id",
          "order_line",
          "note",
        ],
      },
    );

    if (!orders || orders.length === 0) {
      throw new NotFoundException(`Sales Order #${orderId} not found in Odoo`);
    }

    const order = orders[0];
    let lines: any[] = [];
    if (order.order_line && order.order_line.length > 0) {
      lines = await this.executeKw(
        "sale.order.line",
        "search_read",
        [[["id", "in", order.order_line]]],
        {
          fields: [
            "id",
            "name",
            "product_id",
            "product_uom_qty",
            "product_uom",
            "price_unit",
            "price_subtotal",
            "price_total",
            "discount",
            "tax_id",
          ],
        },
      );
    }

    return {
      id: order.id,
      soNumber: order.name,
      customer: Array.isArray(order.partner_id) ? order.partner_id[1] : "Unknown Customer",
      customerId: Array.isArray(order.partner_id) ? order.partner_id[0] : null,
      invoiceAddress: Array.isArray(order.partner_invoice_id) ? order.partner_invoice_id[1] : null,
      shippingAddress: Array.isArray(order.partner_shipping_id) ? order.partner_shipping_id[1] : null,
      salesperson: Array.isArray(order.user_id) ? order.user_id[1] : null,
      paymentTerm: Array.isArray(order.payment_term_id) ? order.payment_term_id[1] : null,
      date: order.date_order,
      validityDate: order.validity_date || null,
      state: order.state,
      invoiceStatus: order.invoice_status,
      untaxedAmount: Number(order.amount_untaxed || 0),
      taxAmount: Number(order.amount_tax || 0),
      totalAmount: Number(order.amount_total || 0),
      notes: order.note || null,
      lines: lines.map((l: any) => ({
        id: l.id,
        productId: Array.isArray(l.product_id) ? l.product_id[0] : null,
        productName: Array.isArray(l.product_id) ? l.product_id[1] : l.name || "Product Item",
        description: l.name,
        quantity: Number(l.product_uom_qty || 0),
        uom: Array.isArray(l.product_uom) ? l.product_uom[1] : "Units",
        unitPrice: Number(l.price_unit || 0),
        discount: Number(l.discount || 0),
        subtotal: Number(l.price_subtotal || 0),
        total: Number(l.price_total || l.price_subtotal || 0),
      })),
    };
  }

  /**
   * Summary KPI stats for Sales
   */
  async getSalesStats(): Promise<any> {
    const orders = await this.executeKw(
      "sale.order",
      "search_read",
      [[]],
      {
        fields: ["id", "amount_total", "state"],
        limit: 200,
      },
    );

    const totalOrders = orders.length;
    const quotations = orders.filter((o: any) => o.state === "draft" || o.state === "sent").length;
    const confirmedOrders = orders.filter((o: any) => o.state === "sale" || o.state === "done").length;
    const totalSalesValue = orders
      .filter((o: any) => o.state === "sale" || o.state === "done")
      .reduce((sum: number, o: any) => sum + Number(o.amount_total || 0), 0);

    return {
      totalOrders,
      quotations,
      confirmedOrders,
      totalSalesValue: Math.round(totalSalesValue * 100) / 100,
    };
  }
}


