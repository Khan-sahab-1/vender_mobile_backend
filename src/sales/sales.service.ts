import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SalesOrder } from './entities/sales-order.entity';
import { SalesOrderLine } from './entities/sales-order-line.entity';
import { Partner } from '../partners/entities/partner.entity';
import { Product } from '../products/entities/product.entity';
import { Tax } from '../taxes/entities/tax.entity';
import { Warehouse } from '../warehouses/entities/warehouse.entity';
import { Division } from '../divisions/entities/division.entity';
import { Location, LocationUsage } from '../locations/entities/location.entity';
import { CustomerInvoicesService } from '../customer-invoices/customer-invoices.service';
import { CustomerInvoice } from '../customer-invoices/entities/customer-invoice.entity';
import { CustomerInvoiceState } from '../customer-invoices/enums/customer-invoice.enum';
import { StockPickingsService } from '../stock-pickings/stock-pickings.service';
import { PickingType } from '../stock-pickings/enums/stock-picking.enum';
import { Uom, UomType } from '../uom/entities/uom.entity';
import { CreateSalesOrderDto } from './dto/create-sales-order.dto';
import { UpdateSalesOrderDto } from './dto/update-sales-order.dto';
import { SalesOrderState, SalesOrderType } from './enums/sales-order.enum';

@Injectable()
export class SalesService {
  constructor(
    @InjectRepository(SalesOrder)
    private readonly orderRepo: Repository<SalesOrder>,
    @InjectRepository(SalesOrderLine)
    private readonly lineRepo: Repository<SalesOrderLine>,
    @InjectRepository(Partner)
    private readonly partnerRepo: Repository<Partner>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(Tax)
    private readonly taxRepo: Repository<Tax>,
    @InjectRepository(Warehouse)
    private readonly warehouseRepo: Repository<Warehouse>,
    @InjectRepository(Division)
    private readonly divisionRepo: Repository<Division>,
    @InjectRepository(Location)
    private readonly locationRepo: Repository<Location>,
    private readonly customerInvoicesService: CustomerInvoicesService,
    private readonly stockPickingsService: StockPickingsService,
  ) {}

  async generateSoName(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.orderRepo
      .createQueryBuilder('so')
      .where('so.name LIKE :prefix', { prefix: `SO/${year}/%` })
      .getCount();
    const seq = String(count + 1).padStart(5, '0');
    return `SO/${year}/${seq}`;
  }

  async create(dto: CreateSalesOrderDto, companyId?: string): Promise<any> {
    const [customer, warehouse, division] = await Promise.all([
      this.partnerRepo.findOne({ where: { id: dto.customerId } }),
      this.warehouseRepo.findOne({ where: { id: dto.warehouseId } }),
      this.divisionRepo.findOne({ where: { id: dto.divisionId } }),
    ]);

    if (!customer) throw new BadRequestException('Customer not found');
    if (!warehouse) throw new BadRequestException('Warehouse not found');
    if (!division) throw new BadRequestException('Division not found');

    // Auto delivery address from customer if not provided
    let deliveryAddress = dto.deliveryAddress?.trim();
    if (!deliveryAddress) {
      deliveryAddress =
        [
          customer.street,
          customer.street2,
          customer.city,
          customer.state,
          customer.zip,
          customer.country,
        ]
          .filter(Boolean)
          .join(', ') || customer.name;
    }

    const orderDate = dto.orderDate ? new Date(dto.orderDate) : new Date();
    const deliveryDays = dto.deliveryDays ? Number(dto.deliveryDays) : 0;
    let deliveryDate: Date | null = null;
    if (dto.deliveryDate) {
      deliveryDate = new Date(dto.deliveryDate);
    } else if (deliveryDays > 0) {
      deliveryDate = new Date(orderDate.getTime() + deliveryDays * 86400000);
    }

    const soName = await this.generateSoName();

    let amountUntaxed = 0;
    let amountDiscount = 0;
    let amountTax = 0;

    const order = this.orderRepo.create({
      name: soName,
      companyId: companyId || customer.companyId,
      type: dto.orderType || SalesOrderType.ADHOC,
      customerId: dto.customerId,
      customer,
      deliveryAddress,
      poRefNo: dto.poRefNo,
      clientPoDate: dto.clientPoDate ? new Date(dto.clientPoDate) : undefined,
      orderDate,
      deliveryDays,
      deliveryDate: deliveryDate || undefined,
      warehouseId: dto.warehouseId,
      warehouse,
      divisionId: dto.divisionId,
      division,
      pricelistId: dto.pricelistId,
      paymentTermId: dto.paymentTermId || customer.paymentTermId,
      transporterId: dto.transporterId,
      transporterName: dto.transporterName,
      state: SalesOrderState.DRAFT,
      note: dto.note,
      currency: 'INR',
    });

    const savedOrder = await this.orderRepo.save(order);

    const lines: SalesOrderLine[] = [];
    if (Array.isArray(dto.lines) && dto.lines.length > 0) {
      for (const l of dto.lines) {
        const product = await this.productRepo.findOne({
          where: { id: l.productId },
        });
        const tax = l.taxId
          ? await this.taxRepo.findOne({ where: { id: l.taxId } })
          : null;

        const qty = Number(l.quantity) || 1;
        const unitPrice =
          l.unitPrice !== undefined
            ? Number(l.unitPrice)
            : product
            ? Number(product.salesPrice)
            : 0;
        const discountPct = Number(l.discount) || 0;

        const lineBase = qty * unitPrice;
        const discountAmount = lineBase * (discountPct / 100);
        const subtotal = lineBase - discountAmount;
        const taxAmount = tax ? subtotal * (Number(tax.amount) / 100) : 0;
        const total = subtotal + taxAmount;

        amountUntaxed += subtotal;
        amountDiscount += discountAmount;
        amountTax += taxAmount;

        const line = this.lineRepo.create({
          orderId: savedOrder.id,
          productId: l.productId,
          product: product || undefined,
          description: l.description || product?.name || 'Sales Item',
          quantity: qty,
          unitPrice,
          discount: discountPct,
          discountAmount: Math.round(discountAmount * 100) / 100,
          taxId: l.taxId,
          tax: tax || undefined,
          taxAmount: Math.round(taxAmount * 100) / 100,
          subtotal: Math.round(subtotal * 100) / 100,
          total: Math.round(total * 100) / 100,
        });

        lines.push(line);
      }

      await this.lineRepo.save(lines);
    }

    savedOrder.amountUntaxed = Math.round(amountUntaxed * 100) / 100;
    savedOrder.amountDiscount = Math.round(amountDiscount * 100) / 100;
    savedOrder.amountTax = Math.round(amountTax * 100) / 100;
    savedOrder.amountTotal =
      Math.round((amountUntaxed + amountTax) * 100) / 100;
    savedOrder.lines = lines;

    return this.orderRepo.save(savedOrder);
  }

  async update(id: string, dto: UpdateSalesOrderDto): Promise<any> {
    const order = await this.orderRepo.findOne({
      where: { id },
      relations: ['lines'],
    });

    if (!order) {
      throw new NotFoundException(`Sales Order ${id} not found`);
    }

    if (
      order.state === SalesOrderState.DONE ||
      order.state === SalesOrderState.CANCEL
    ) {
      throw new BadRequestException(
        `Cannot edit a Sales Order in ${order.state} state`,
      );
    }

    if (dto.customerId) {
      const customer = await this.partnerRepo.findOne({
        where: { id: dto.customerId },
      });
      if (!customer) throw new BadRequestException('Customer not found');
      order.customerId = dto.customerId;
      order.customer = customer;
    }

    if (dto.warehouseId) {
      const warehouse = await this.warehouseRepo.findOne({
        where: { id: dto.warehouseId },
      });
      if (!warehouse) throw new BadRequestException('Warehouse not found');
      order.warehouseId = dto.warehouseId;
      order.warehouse = warehouse;
    }

    if (dto.divisionId) {
      const division = await this.divisionRepo.findOne({
        where: { id: dto.divisionId },
      });
      if (!division) throw new BadRequestException('Division not found');
      order.divisionId = dto.divisionId;
      order.division = division;
    }

    if (dto.deliveryAddress !== undefined) {
      order.deliveryAddress = dto.deliveryAddress;
    }
    if (dto.poRefNo !== undefined) {
      order.poRefNo = dto.poRefNo;
    }
    if (dto.clientPoDate !== undefined) {
      order.clientPoDate = dto.clientPoDate
        ? new Date(dto.clientPoDate)
        : (null as any);
    }
    if (dto.orderDate !== undefined) {
      order.orderDate = dto.orderDate
        ? new Date(dto.orderDate)
        : order.orderDate;
    }
    if (dto.deliveryDays !== undefined) {
      order.deliveryDays = Number(dto.deliveryDays);
    }
    if (dto.deliveryDate !== undefined) {
      order.deliveryDate = dto.deliveryDate
        ? new Date(dto.deliveryDate)
        : (null as any);
    } else if (dto.deliveryDays !== undefined && order.deliveryDays > 0) {
      order.deliveryDate = new Date(
        order.orderDate.getTime() + order.deliveryDays * 86400000,
      );
    }

    if (dto.pricelistId !== undefined) order.pricelistId = dto.pricelistId;
    if (dto.paymentTermId !== undefined)
      order.paymentTermId = dto.paymentTermId;
    if (dto.orderType !== undefined) order.type = dto.orderType;
    if (dto.transporterId !== undefined)
      order.transporterId = dto.transporterId;
    if (dto.transporterName !== undefined)
      order.transporterName = dto.transporterName;
    if (dto.note !== undefined) order.note = dto.note;

    // If new lines provided, replace existing lines and recalculate
    if (Array.isArray(dto.lines)) {
      await this.lineRepo.delete({ orderId: id });

      let amountUntaxed = 0;
      let amountDiscount = 0;
      let amountTax = 0;
      const newLines: SalesOrderLine[] = [];

      for (const l of dto.lines) {
        const product = await this.productRepo.findOne({
          where: { id: l.productId },
        });
        const tax = l.taxId
          ? await this.taxRepo.findOne({ where: { id: l.taxId } })
          : null;

        const qty = Number(l.quantity) || 1;
        const unitPrice =
          l.unitPrice !== undefined
            ? Number(l.unitPrice)
            : product
            ? Number(product.salesPrice)
            : 0;
        const discountPct = Number(l.discount) || 0;

        const lineBase = qty * unitPrice;
        const discountAmount = lineBase * (discountPct / 100);
        const subtotal = lineBase - discountAmount;
        const taxAmount = tax ? subtotal * (Number(tax.amount) / 100) : 0;
        const total = subtotal + taxAmount;

        amountUntaxed += subtotal;
        amountDiscount += discountAmount;
        amountTax += taxAmount;

        const line = this.lineRepo.create({
          orderId: order.id,
          productId: l.productId,
          product: product || undefined,
          description: l.description || product?.name || 'Sales Item',
          quantity: qty,
          unitPrice,
          discount: discountPct,
          discountAmount: Math.round(discountAmount * 100) / 100,
          taxId: l.taxId,
          tax: tax || undefined,
          taxAmount: Math.round(taxAmount * 100) / 100,
          subtotal: Math.round(subtotal * 100) / 100,
          total: Math.round(total * 100) / 100,
        });
        newLines.push(line);
      }

      await this.lineRepo.save(newLines);
      order.amountUntaxed = Math.round(amountUntaxed * 100) / 100;
      order.amountDiscount = Math.round(amountDiscount * 100) / 100;
      order.amountTax = Math.round(amountTax * 100) / 100;
      order.amountTotal =
        Math.round((amountUntaxed + amountTax) * 100) / 100;
      order.lines = newLines;
    }

    await this.orderRepo.save(order);
    return this.getSalesOrderDetail(id);
  }

  async getSalesOrders(
    filters: { search?: string; state?: string; limit?: number } = {},
  ): Promise<any[]> {
    const qb = this.orderRepo
      .createQueryBuilder('so')
      .leftJoinAndSelect('so.customer', 'customer')
      .leftJoinAndSelect('so.division', 'division')
      .leftJoinAndSelect('so.warehouse', 'warehouse')
      .leftJoinAndSelect('so.customerInvoice', 'customerInvoice')
      .leftJoinAndSelect('so.stockPicking', 'stockPicking')
      .leftJoinAndSelect('so.lines', 'lines')
      .leftJoinAndSelect('lines.product', 'product')
      .orderBy('so.createdAt', 'DESC');

    if (filters.state && filters.state !== 'all') {
      qb.andWhere('so.state = :state', { state: filters.state });
    }

    if (filters.search && filters.search.trim()) {
      const q = `%${filters.search.trim().toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(so.name) LIKE :q OR LOWER(customer.name) LIKE :q OR LOWER(so.poRefNo) LIKE :q)',
        { q },
      );
    }

    if (filters.limit) {
      qb.take(filters.limit);
    }

    const orders = await qb.getMany();

    const orderIds = orders.map((o) => o.id);
    const invoiceMap = new Map<string, any[]>();
    if (orderIds.length > 0) {
      const allInvoices = await this.orderRepo.manager
        .getRepository(CustomerInvoice)
        .find({
          where: orderIds.map((id) => ({ salesOrderId: id })),
          order: { createdAt: 'DESC' },
        });
      for (const inv of allInvoices) {
        if (inv.salesOrderId) {
          if (!invoiceMap.has(inv.salesOrderId)) {
            invoiceMap.set(inv.salesOrderId, []);
          }
          invoiceMap.get(inv.salesOrderId)!.push(inv);
        }
      }
    }

    return orders.map((o) => {
      const linkedInvoices =
        invoiceMap.get(o.id) || (o.customerInvoice ? [o.customerInvoice] : []);
      const invoiceCount = linkedInvoices.length;

      return {
        id: o.id,
        name: o.name,
        soNumber: o.name,
        customer: o.customer?.name || 'Customer',
        customerId: o.customerId,
        customerRecord: o.customer,
        deliveryAddress: o.deliveryAddress,
        poRefNo: o.poRefNo,
        clientRef: o.poRefNo,
        clientPoDate: o.clientPoDate,
        orderDate: o.orderDate,
        date: o.orderDate,
        deliveryDays: o.deliveryDays,
        deliveryDate: o.deliveryDate,
        customerInvoice: linkedInvoices[0] || o.customerInvoice || null,
        customerInvoiceId:
          linkedInvoices[0]?.id || o.customerInvoiceId || null,
        customerInvoices: linkedInvoices,
        customerInvoiceCount: invoiceCount,
        stockPicking: o.stockPicking,
        stockPickingId: o.stockPickingId,
        type: o.type,
        state: o.state,
        currency: o.currency || 'INR',
        untaxedAmount: Number(o.amountUntaxed || 0),
        taxAmount: Number(o.amountTax || 0),
        totalAmount: Number(o.amountTotal || 0),
        discountAmount: Number(o.amountDiscount || 0),
        warehouse: o.warehouse,
        division: o.division,
        pricelist: o.pricelist,
        paymentTerm: o.paymentTerm,
        transporter: o.transporter,
        transporterName: o.transporterName,
        note: o.note,
        lines: o.lines?.map((l) => ({
          id: l.id,
          productId: l.productId,
          product: l.product,
          description: l.description,
          productName: l.product?.name || l.description,
          quantity: Number(l.quantity || 0),
          unitPrice: Number(l.unitPrice || 0),
          discount: Number(l.discount || 0),
          discountAmount: Number(l.discountAmount || 0),
          tax: l.tax,
          taxAmount: Number(l.taxAmount || 0),
          subtotal: Number(l.subtotal || 0),
          total: Number(l.total || 0),
        })),
      };
    });
  }

  async getSalesOrderDetail(id: string): Promise<any> {
    const o = await this.orderRepo.findOne({
      where: { id },
      relations: [
        'customer',
        'division',
        'warehouse',
        'pricelist',
        'paymentTerm',
        'transporter',
        'customerInvoice',
        'customerInvoice.lines',
        'stockPicking',
        'lines',
        'lines.product',
        'lines.tax',
      ],
    });

    if (!o) {
      throw new NotFoundException(`Sales Order #${id} not found`);
    }

    // Fetch all customer invoices linked to this SO
    const allInvoices = await this.orderRepo.manager
      .getRepository(CustomerInvoice)
      .find({
        where: { salesOrderId: id },
        relations: ['lines', 'lines.product', 'lines.tax'],
        order: { createdAt: 'DESC' },
      });

    // Calculate line-level invoiced quantities across all non-cancelled invoices
    const linesWithInvoiced = (o.lines || []).map((l) => {
      let invoicedQty = 0;
      allInvoices.forEach((inv) => {
        if (
          inv.state === CustomerInvoiceState.CANCELLED ||
          (inv.state as string) === 'cancel'
        )
          return;
        (inv.lines || []).forEach((invLine) => {
          if (invLine.productId === l.productId) {
            invoicedQty += Number(invLine.quantity || 0);
          }
        });
      });
      const orderedQty = Number(l.quantity || 0);
      const remainingQty = Math.max(0, orderedQty - invoicedQty);

      return {
        ...l,
        productName: l.product?.name || l.description,
        uom: l.product?.uom?.name || 'Units',
        quantity: orderedQty,
        orderedQuantity: orderedQty,
        invoicedQuantity: invoicedQty,
        remainingQuantity: remainingQty,
        unitPrice: Number(l.unitPrice || 0),
        subtotal: Number(l.subtotal || 0),
        total: Number(l.total || 0),
      };
    });

    const activeInvoices = allInvoices.filter(
      (inv) =>
        inv.state !== CustomerInvoiceState.CANCELLED &&
        (inv.state as string) !== 'cancel',
    );
    const totalInvoicedAmount = activeInvoices.reduce(
      (sum, inv) => sum + Number(inv.amountTotal || 0),
      0,
    );

    const isFullyInvoiced =
      activeInvoices.length > 0 &&
      linesWithInvoiced.length > 0 &&
      linesWithInvoiced.every((l) => l.remainingQuantity <= 0);

    return {
      ...o,
      soNumber: o.name,
      customerRecord: o.customer,
      customer: o.customer?.name || 'Customer',
      clientRef: o.poRefNo,
      date: o.orderDate,
      customerInvoices: allInvoices,
      customerInvoiceCount: allInvoices.length,
      customerInvoice: allInvoices[0] || o.customerInvoice || null,
      customerInvoiceId: allInvoices[0]?.id || o.customerInvoiceId || null,
      totalInvoicedAmount: Math.round(totalInvoicedAmount * 100) / 100,
      remainingAmountToInvoice: Math.max(
        0,
        Math.round((Number(o.amountTotal || 0) - totalInvoicedAmount) * 100) /
          100,
      ),
      isFullyInvoiced,
      stockPicking: o.stockPicking,
      stockPickingId: o.stockPickingId,
      untaxedAmount: Number(o.amountUntaxed || 0),
      taxAmount: Number(o.amountTax || 0),
      totalAmount: Number(o.amountTotal || 0),
      discountAmount: Number(o.amountDiscount || 0),
      lines: linesWithInvoiced,
    };
  }

  async createInvoiceForSalesOrder(
    id: string,
    dto?: {
      lines?: Array<{
        productId?: string;
        lineId?: string;
        quantity: number;
        unitPrice?: number;
      }>;
    },
  ): Promise<any> {
    const order = await this.orderRepo.findOne({
      where: { id },
      relations: [
        'customer',
        'warehouse',
        'division',
        'lines',
        'lines.product',
        'lines.tax',
      ],
    });
    if (!order) throw new NotFoundException(`Sales Order ${id} not found`);

    if (
      order.state !== SalesOrderState.APPROVED &&
      order.state !== SalesOrderState.SALE &&
      order.state !== SalesOrderState.DRAFT
    ) {
      throw new BadRequestException(
        `Cannot create invoice for order in "${order.state}" state`,
      );
    }

    let linesToInvoice = dto?.lines;

    // If no custom lines provided, invoice remaining un-invoiced quantities
    if (!linesToInvoice || linesToInvoice.length === 0) {
      const existingInvoices = await this.orderRepo.manager
        .getRepository(CustomerInvoice)
        .find({
          where: { salesOrderId: id },
          relations: ['lines'],
        });

      const remainingLines: Array<{
        lineId: string;
        productId: string;
        quantity: number;
      }> = [];

      for (const line of order.lines || []) {
        let invoicedQty = 0;
        existingInvoices.forEach((inv) => {
          if (
            inv.state === CustomerInvoiceState.CANCELLED ||
            (inv.state as string) === 'cancel'
          )
            return;
          (inv.lines || []).forEach((invLine) => {
            if (invLine.productId === line.productId) {
              invoicedQty += Number(invLine.quantity || 0);
            }
          });
        });
        const rem = Math.max(0, Number(line.quantity || 0) - invoicedQty);
        if (rem > 0) {
          remainingLines.push({
            lineId: line.id,
            productId: line.productId,
            quantity: rem,
          });
        }
      }

      if (remainingLines.length === 0) {
        // If all items already invoiced, allow invoicing 100% full lines as an additional billing
        linesToInvoice = (order.lines || []).map((l) => ({
          lineId: l.id,
          productId: l.productId,
          quantity: Number(l.quantity || 1),
        }));
      } else {
        linesToInvoice = remainingLines;
      }
    }

    const customerInvoice =
      await this.customerInvoicesService.createFromSalesOrder(
        order,
        linesToInvoice,
      );

    order.customerInvoiceId = customerInvoice.id;
    order.customerInvoice = customerInvoice;
    await this.orderRepo.save(order);

    return this.getSalesOrderDetail(id);
  }

  async sendForApproval(id: string): Promise<any> {
    const order = await this.orderRepo.findOne({ where: { id } });
    if (!order) throw new NotFoundException(`Sales Order ${id} not found`);
    if (order.state !== SalesOrderState.DRAFT) {
      throw new BadRequestException(
        `Order cannot be sent for approval from state: ${order.state}`,
      );
    }
    order.state = SalesOrderState.SENT_FOR_APPROVAL;
    return this.orderRepo.save(order);
  }

  /**
   * Admin approves Sales Order:
   * In Odoo standard & integrated flow:
   * 1. Creates Customer Bill / Customer Invoice (account.move - out_invoice) in DRAFT state
   * 2. Creates Stock Picking (Delivery Order WH/OUT/...) and Stock Moves (WH/Stock -> Customer)
   * 3. Transitions state: SENT_FOR_APPROVAL / DRAFT -> APPROVED (with customerInvoice & stockPicking linked)
   */
  async approveOrder(id: string): Promise<any> {
    const order = await this.orderRepo.findOne({
      where: { id },
      relations: [
        'customer',
        'warehouse',
        'division',
        'lines',
        'lines.product',
        'lines.tax',
      ],
    });
    if (!order) throw new NotFoundException(`Sales Order ${id} not found`);

    if (
      order.state !== SalesOrderState.DRAFT &&
      order.state !== SalesOrderState.SENT_FOR_APPROVAL
    ) {
      if (order.state === SalesOrderState.APPROVED) {
        if (!order.customerInvoiceId) {
          try {
            const customerInvoice =
              await this.customerInvoicesService.createFromSalesOrder(order);
            order.customerInvoiceId = customerInvoice.id;
            order.customerInvoice = customerInvoice;
            await this.orderRepo.save(order);
          } catch (err) {
            console.error('Warning: Failed to create customer invoice for existing approved SO', err);
          }
        }
        return this.getSalesOrderDetail(id);
      }
      throw new BadRequestException(
        `Cannot approve order in "${order.state}" state (must be draft or sent_for_approval)`,
      );
    }

    if (!order.name || !order.name.startsWith('SO/')) {
      order.name = await this.generateSoName();
    }

    // 1. Direct Flow: Generate Customer Bill (Customer Invoice) from SO pulling customer, addresses, division, currency, lines
    try {
      const customerInvoice =
        await this.customerInvoicesService.createFromSalesOrder(order);
      order.customerInvoiceId = customerInvoice.id;
      order.customerInvoice = customerInvoice;
    } catch (err) {
      console.error('Warning: Failed to create customer invoice for SO', err);
    }

    // 2. Inventory Flow: Generate Stock Picking (Delivery Order) & Stock Moves (WH/Stock -> Customer)
    try {
      let customerLocation = await this.locationRepo.findOne({
        where: { usage: LocationUsage.CUSTOMER },
      });
      if (!customerLocation) {
        customerLocation = await this.locationRepo.findOne({
          where: { name: 'Customers' },
        });
      }
      if (!customerLocation) {
        customerLocation = await this.locationRepo.save(
          this.locationRepo.create({
            name: 'Customers',
            completeName: 'Partner Locations / Customers',
            usage: LocationUsage.CUSTOMER,
          }),
        );
      }

      let sourceLocation = await this.locationRepo.findOne({
        where: {
          warehouseId: order.warehouseId,
          usage: LocationUsage.INTERNAL,
        },
      });
      if (!sourceLocation) {
        const wh =
          order.warehouse ||
          (order.warehouseId
            ? await this.warehouseRepo.findOne({
                where: { id: order.warehouseId },
              })
            : null);
        sourceLocation = await this.locationRepo.save(
          this.locationRepo.create({
            name: `${wh?.code || 'WH'} Stock`,
            completeName: `${wh?.code || 'WH'} / Stock`,
            usage: LocationUsage.INTERNAL,
            warehouseId: order.warehouseId,
          }),
        );
      }

      const uomRepo = this.orderRepo.manager.getRepository(Uom);
      const defaultUom =
        (await uomRepo.findOne({
          where: { uomType: UomType.REFERENCE },
        })) || (await uomRepo.findOne({}));

      const validLines = (order.lines || []).filter((l) => l.productId);
      if (validLines.length > 0 && order.warehouseId) {
        const picking = await this.stockPickingsService.create({
          pickingType: PickingType.DELIVERY,
          warehouseId: order.warehouseId,
          partnerId: order.customerId,
          sourceLocationId: sourceLocation.id,
          destLocationId: customerLocation.id,
          origin: order.name,
          scheduledDate: order.deliveryDate
            ? order.deliveryDate.toISOString()
            : order.orderDate.toISOString(),
          moves: validLines.map((l) => ({
            productId: l.productId,
            quantity: Number(l.quantity),
            uomId: l.product?.uomId || defaultUom?.id,
          })),
        });

        // Automatically confirm picking (moves state from DRAFT -> CONFIRMED)
        const confirmedPicking = await this.stockPickingsService.confirm(
          picking.id,
        );
        order.stockPickingId = confirmedPicking.id;
      }
    } catch (err) {
      console.error('Warning: Failed to create stock picking for SO', err);
    }

    order.state = SalesOrderState.APPROVED;
    await this.orderRepo.save(order);
    return this.getSalesOrderDetail(id);
  }

  async deliverGoods(id: string): Promise<any> {
    const order = await this.orderRepo.findOne({
      where: { id },
      relations: ['customerInvoice', 'stockPicking'],
    });
    if (!order) throw new NotFoundException(`Sales Order ${id} not found`);

    if (!order.customerInvoiceId || !order.customerInvoice) {
      throw new BadRequestException(
        'Cannot deliver goods: No Customer Bill found for this sales order. Please validate the bill first.',
      );
    }

    if (order.customerInvoice.state === CustomerInvoiceState.DRAFT) {
      throw new BadRequestException(
        `Cannot deliver goods: The Customer Bill (${order.customerInvoice.invoiceNumber || 'Draft'}) is still in Draft state. You must validate the invoice before delivering goods from warehouse stock.`,
      );
    }

    if (!order.stockPickingId) {
      throw new BadRequestException(
        'No outgoing delivery order found for this sales order',
      );
    }

    await this.stockPickingsService.validatePicking(order.stockPickingId);
    return this.getSalesOrderDetail(id);
  }

  async confirmOrder(id: string): Promise<any> {
    const order = await this.orderRepo.findOne({ where: { id } });
    if (!order) throw new NotFoundException(`Sales Order ${id} not found`);
    order.state = SalesOrderState.APPROVED;
    return this.orderRepo.save(order);
  }

  async cancelOrder(id: string): Promise<any> {
    const order = await this.orderRepo.findOne({ where: { id } });
    if (!order) throw new NotFoundException(`Sales Order ${id} not found`);
    order.state = SalesOrderState.CANCEL;
    return this.orderRepo.save(order);
  }

  async getSalesStats(): Promise<any> {
    const totalOrders = await this.orderRepo.count();
    const quotations = await this.orderRepo.count({
      where: { state: SalesOrderState.DRAFT },
    });
    const pendingApproval = await this.orderRepo.count({
      where: { state: SalesOrderState.SENT_FOR_APPROVAL },
    });
    const confirmedOrders = await this.orderRepo.count({
      where: [
        { state: SalesOrderState.APPROVED },
        { state: SalesOrderState.SALE },
      ],
    });

    const sumResult = await this.orderRepo
      .createQueryBuilder('so')
      .select('SUM(so.amount_total)', 'total')
      .where('so.state IN (:...states)', {
        states: [
          SalesOrderState.APPROVED,
          SalesOrderState.SALE,
          SalesOrderState.DONE,
        ],
      })
      .getRawOne();

    const totalSalesValue = Number(sumResult?.total || 0);

    return {
      totalOrders,
      quotations,
      pendingApproval,
      confirmedOrders,
      totalSalesValue: Math.round(totalSalesValue * 100) / 100,
    };
  }
}
