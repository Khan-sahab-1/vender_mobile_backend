import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccountAccountsService } from '../account-accounts/account-accounts.service';
import { AccountType } from '../account-accounts/enums/account-account.enum';
import { AccountJournal } from '../account-journals/entities/account-journal.entity';
import { AccountJournalType } from '../account-journals/enums/account-journal.enum';
import { AccountMovesService } from '../account-moves/account-moves.service';
import { AccountMove } from '../account-moves/entities/account-move.entity';
import {
  AccountMoveState,
  AccountMoveType,
} from '../account-moves/enums/account-move.enum';
import { CustomerInvoiceQueryDto } from './dto/customer-invoice-query.dto';
import { RegisterInvoicePaymentDto } from './dto/register-payment.dto';
import { CustomerInvoiceLine } from './entities/customer-invoice-line.entity';
import { CustomerInvoice } from './entities/customer-invoice.entity';
import { CustomerInvoiceState } from './enums/customer-invoice.enum';

@Injectable()
export class CustomerInvoicesService {
  constructor(
    @InjectRepository(CustomerInvoice)
    private readonly invoiceRepo: Repository<CustomerInvoice>,
    @InjectRepository(CustomerInvoiceLine)
    private readonly lineRepo: Repository<CustomerInvoiceLine>,
    @InjectRepository(AccountJournal)
    private readonly journalRepo: Repository<AccountJournal>,
    private readonly accountAccountsService: AccountAccountsService,
    private readonly accountMovesService: AccountMovesService,
  ) {}

  async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const result = await this.invoiceRepo.manager.query(
      `SELECT COALESCE(MAX(seq), 0) as max_seq FROM (
        SELECT CAST(SUBSTRING(invoice_number FROM 'INV/\\d{4}/(\\d+)') AS INTEGER) AS seq 
        FROM customer_invoices 
        WHERE invoice_number LIKE 'INV/${year}/%'
        UNION
        SELECT CAST(SUBSTRING(name FROM 'INV/\\d{4}/(\\d+)') AS INTEGER) AS seq 
        FROM account_moves 
        WHERE name LIKE 'INV/${year}/%'
      ) t`,
    );
    const maxSeq = result && result[0] ? Number(result[0].max_seq) : 0;
    let nextSeq = maxSeq + 1;
    let candidate = `INV/${year}/${String(nextSeq).padStart(5, '0')}`;
    while (
      (await this.invoiceRepo.findOne({ where: { invoiceNumber: candidate } })) ||
      (await this.invoiceRepo.manager.getRepository(AccountMove).findOne({ where: { name: candidate } }))
    ) {
      nextSeq++;
      candidate = `INV/${year}/${String(nextSeq).padStart(5, '0')}`;
    }
    return candidate;
  }

  formatCustomerAddress(customer: any): string {
    if (!customer) return 'No address provided';
    const parts = [
      customer.street,
      customer.street2,
      customer.city,
      customer.state,
      customer.zip,
      customer.country,
    ].filter(Boolean);
    return parts.join(', ') || 'No address provided';
  }

  /**
   * Step 1: Create Customer Invoice in DRAFT state from Sales Order
   * Mirrors Odoo: At draft state, invoice & lines exist.
   * No journal entry (account.move) is created yet until validated.
   */
  async createFromSalesOrder(
    so: any,
    lineOverrides?: Array<{
      productId?: string;
      lineId?: string;
      quantity: number;
      unitPrice?: number;
    }>,
  ): Promise<CustomerInvoice> {
    const customerAddress = this.formatCustomerAddress(so.customer);

    // Find default Sale journal (INV)
    let journal = await this.journalRepo.findOne({
      where: { code: 'INV' },
    });
    if (!journal) {
      journal = await this.journalRepo.findOne({
        where: { type: AccountJournalType.SALE },
      });
    }
    if (!journal) {
      journal = (await this.journalRepo.save(
        this.journalRepo.create({
          name: 'Customer Invoices',
          code: 'INV',
          type: AccountJournalType.SALE,
        }),
      )) as any;
    }

    let amountUntaxed = 0;
    let amountDiscount = 0;
    let amountTax = 0;
    let amountTotal = 0;

    let invoiceLinesData: Array<{
      productId: string;
      description: string;
      quantity: number;
      unitPrice: number;
      discount: number;
      taxId?: string;
      taxAmount: number;
      subtotal: number;
    }> = [];

    if (Array.isArray(lineOverrides) && lineOverrides.length > 0) {
      for (const override of lineOverrides) {
        const soLine = (so.lines || []).find(
          (l: any) =>
            (override.lineId && l.id === override.lineId) ||
            (override.productId && l.productId === override.productId),
        );
        const qty = Number(override.quantity || 1);
        if (qty <= 0) continue;
        const price =
          override.unitPrice !== undefined
            ? Number(override.unitPrice)
            : Number(soLine?.unitPrice || 0);
        const discountPercent = Number(soLine?.discount || 0);
        const lineSubtotal = qty * price;
        const lineDiscount = lineSubtotal * (discountPercent / 100);
        const taxable = lineSubtotal - lineDiscount;
        const taxRate = soLine?.tax
          ? (Number(soLine.tax.amount) || 0) / 100
          : 0;
        const lineTaxAmount = taxable * taxRate;
        const lineTotal = taxable + lineTaxAmount;

        amountUntaxed += taxable;
        amountDiscount += lineDiscount;
        amountTax += lineTaxAmount;
        amountTotal += lineTotal;

        invoiceLinesData.push({
          productId: override.productId || soLine?.productId,
          description:
            soLine?.description || soLine?.product?.name || 'Sales item',
          quantity: qty,
          unitPrice: price,
          discount: discountPercent,
          taxId: soLine?.taxId,
          taxAmount: Math.round(lineTaxAmount * 100) / 100,
          subtotal: Math.round(lineTotal * 100) / 100,
        });
      }
    } else {
      amountUntaxed = Number(so.amountUntaxed || 0);
      amountDiscount = Number(so.amountDiscount || 0);
      amountTax = Number(so.amountTax || 0);
      amountTotal = Number(so.amountTotal || 0);

      invoiceLinesData = (so.lines || []).map((l: any) => ({
        productId: l.productId,
        description: l.description || l.product?.name || 'Sales item',
        quantity: Number(l.quantity || 1),
        unitPrice: Number(l.unitPrice || 0),
        discount: Number(l.discount || 0),
        taxId: l.taxId,
        taxAmount: Number(l.taxAmount || 0),
        subtotal: Number(l.subtotal || 0),
      }));
    }

    amountUntaxed = Math.round(amountUntaxed * 100) / 100;
    amountDiscount = Math.round(amountDiscount * 100) / 100;
    amountTax = Math.round(amountTax * 100) / 100;
    amountTotal = Math.round(amountTotal * 100) / 100;

    const invoice = this.invoiceRepo.create({
      invoiceNumber: null as any, // Generated upon validation
      journalId: journal?.id,
      customerId: so.customerId,
      customerName: so.customer?.name ?? 'Unknown Customer',
      customerAddress,
      deliveryAddress: so.deliveryAddress,
      warehouseId: so.warehouseId,
      divisionId: so.divisionId,
      companyId: so.companyId,
      currency: so.currency || 'INR',
      invoiceDate: new Date(),
      dueDate: so.deliveryDate ? new Date(so.deliveryDate) : new Date(),
      sourceDocument: so.name,
      salesOrderId: so.id,
      state: CustomerInvoiceState.DRAFT,
      amountUntaxed,
      amountDiscount,
      amountTax,
      amountTotal,
      residualAmount: amountTotal, // Full amount due initially
      notes: so.note,
    });

    const savedInvoice = await this.invoiceRepo.save(invoice);

    if (invoiceLinesData.length > 0) {
      const invLines = invoiceLinesData.map((l) =>
        this.lineRepo.create({
          invoiceId: savedInvoice.id,
          invoice: { id: savedInvoice.id } as any,
          productId: l.productId,
          description: l.description,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          discount: l.discount,
          taxId: l.taxId,
          taxAmount: l.taxAmount,
          subtotal: l.subtotal,
        }),
      );
      await this.lineRepo.save(invLines);
    }

    return this.findOne(savedInvoice.id);
  }

  /**
   * Step 2: Validate Invoice (Odoo: action_invoice_open / validate)
   * Automatically creates the balanced account.move and account.move.line entries:
   *   Dr Accounts Receivable (Customer) $283.20 (Customer balance increases)
   *   Cr Sales Revenue / Income         $240.00 (Income earned increases)
   *   Cr Output Tax (GST / VAT)          $43.20 (Tax liability to gov increases)
   * Debit == Credit (Balanced!)
   * State transitions: DRAFT -> OPEN
   */
  async validateInvoice(id: string): Promise<CustomerInvoice> {
    const invoice = await this.findOne(id);
    if (invoice.state !== CustomerInvoiceState.DRAFT) {
      throw new BadRequestException(
        `Cannot validate invoice in "${invoice.state}" state (must be draft)`,
      );
    }

    // Generate official Invoice Sequence Number upon validation (Odoo style)
    if (
      !invoice.invoiceNumber ||
      invoice.invoiceNumber === 'DRAFT' ||
      invoice.invoiceNumber.startsWith('DRAFT') ||
      (await this.invoiceRepo.manager.getRepository(AccountMove).findOne({ where: { name: invoice.invoiceNumber } }))
    ) {
      invoice.invoiceNumber = await this.generateInvoiceNumber();
    }

    // Ensure default accounts exist in chart of accounts
    let receivableAccount: any = null;
    const partnerReceivableId =
      invoice.customer?.accountReceivableId ||
      invoice.customer?.accountReceivable?.id;
    if (partnerReceivableId) {
      receivableAccount = await this.accountAccountsService
        .findOne(partnerReceivableId)
        .catch(() => null);
    }
    if (!receivableAccount) {
      receivableAccount = await this.accountAccountsService.findOrCreateDefault(
        '105001',
        'Customer Ledger (Sundry Debtors)',
        AccountType.RECEIVABLE,
        true,
        invoice.companyId,
      );
    }

    const incomeAccount = await this.accountAccountsService.findOrCreateDefault(
      '401001',
      'Sales Revenue / Income',
      AccountType.INCOME,
      false,
      invoice.companyId,
    );

    const taxAccount = await this.accountAccountsService.findOrCreateDefault(
      '206001',
      'Output GST / Sales Tax Payable',
      AccountType.TAX,
      false,
      invoice.companyId,
    );

    // Ensure journal is assigned
    let journalId = invoice.journalId;
    if (!journalId) {
      let journal =
        (await this.journalRepo.findOne({ where: { code: 'INV' } })) ||
        (await this.journalRepo.findOne({
          where: { type: AccountJournalType.SALE },
        }));
      if (!journal) {
        journal = (await this.journalRepo.save(
          this.journalRepo.create({
            name: 'Customer Invoices',
            code: 'INV',
            type: AccountJournalType.SALE,
          }),
        )) as any;
      }
      journalId = journal?.id;
      invoice.journalId = journalId;
    }

    const untaxed = Number(invoice.amountUntaxed);
    const tax = Number(invoice.amountTax);
    const total = Number(invoice.amountTotal);

    const moveLines = [
      // Line 1: Dr Accounts Receivable (Customer owes total amount)
      {
        accountId: receivableAccount.id,
        partnerId: invoice.customerId,
        name: `Accounts Receivable: ${invoice.customerName || 'Customer'}`,
        debit: total,
        credit: 0,
      },
      // Line 2: Cr Sales Revenue (Income earned)
      {
        accountId: incomeAccount.id,
        partnerId: invoice.customerId,
        name: `Sales Income: ${invoice.notes || invoice.sourceDocument || 'Sales Item'}`,
        debit: 0,
        credit: untaxed,
      },
    ];

    // Line 3: Cr Output Tax (Tax collected payable to government)
    if (tax > 0) {
      moveLines.push({
        accountId: taxAccount.id,
        partnerId: invoice.customerId,
        name: `Output Tax Payable on ${invoice.invoiceNumber}`,
        debit: 0,
        credit: tax,
      });
    }

    // Create and post balanced Journal Entry (account.move)
    const move = await this.accountMovesService.createAndPostMove(
      {
        journalId,
        partnerId: invoice.customerId,
        ref: `${invoice.invoiceNumber} (${invoice.sourceDocument || ''})`.trim(),
        date: invoice.invoiceDate || new Date(),
        moveType: AccountMoveType.OUT_INVOICE,
        lines: moveLines,
      },
      invoice.invoiceNumber,
    );

    // Update invoice
    invoice.accountMoveId = move.id;
    invoice.state = CustomerInvoiceState.OPEN;
    invoice.residualAmount = total;
    await this.invoiceRepo.save(invoice);

    return this.findOne(id);
  }

  /**
   * Step 3: Register Payment (Odoo: action_register_payment)
   * Automatically generates the Payment Journal Entry (account.move):
   *   Dr Bank / Cash Account    $283.20 (Money received into bank)
   *   Cr Accounts Receivable    $283.20 (Customer balance reduced)
   * Reconciles both account.move.line records!
   * Residual decreases, and once residual == 0, invoice state -> PAID
   */
  async registerPayment(
    id: string,
    dto: RegisterInvoicePaymentDto,
  ): Promise<CustomerInvoice> {
    const invoice = await this.findOne(id);
    if (invoice.state !== CustomerInvoiceState.OPEN) {
      throw new BadRequestException(
        `Cannot register payment for invoice in "${invoice.state}" state (must be open)`,
      );
    }

    const paymentAmount = Number(
      Number(dto.amount ?? invoice.residualAmount).toFixed(4),
    );
    if (paymentAmount <= 0) {
      throw new BadRequestException('Payment amount must be greater than zero');
    }
    if (paymentAmount > Number(invoice.residualAmount) + 0.01) {
      throw new BadRequestException(
        `Payment amount (${paymentAmount}) cannot exceed residual balance (${invoice.residualAmount})`,
      );
    }

    const paymentJournal = await this.journalRepo.findOne({
      where: { id: dto.journalId },
    });
    if (!paymentJournal) {
      throw new NotFoundException('Payment Journal not found');
    }

    // Find Bank / Cash Liquidity account
    let bankAccount = await this.accountAccountsService.findOrCreateDefault(
      '101000',
      'Bank / Cash Liquidity',
      AccountType.BANK,
      true,
      invoice.companyId,
    );

    // Receivable account
    let receivableAccount: any = null;
    const partnerReceivableId =
      invoice.customer?.accountReceivableId ||
      invoice.customer?.accountReceivable?.id;
    if (partnerReceivableId) {
      receivableAccount = await this.accountAccountsService
        .findOne(partnerReceivableId)
        .catch(() => null);
    }
    if (!receivableAccount) {
      receivableAccount = await this.accountAccountsService.findOrCreateDefault(
        '105001',
        'Customer Ledger (Sundry Debtors)',
        AccountType.RECEIVABLE,
        true,
        invoice.companyId,
      );
    }

    const paymentDate = dto.paymentDate ? new Date(dto.paymentDate) : new Date();
    const memo =
      dto.reference || `Receipt for Invoice ${invoice.invoiceNumber}`;

    const paymentMoveLines = [
      // Line 1: Dr Bank / Cash (Asset increases)
      {
        accountId: bankAccount.id,
        partnerId: invoice.customerId,
        name: `Receipt: ${memo}`,
        debit: paymentAmount,
        credit: 0,
      },
      // Line 2: Cr Accounts Receivable (Customer balance reduced)
      {
        accountId: receivableAccount.id,
        partnerId: invoice.customerId,
        name: `Payment from: ${invoice.customerName || 'Customer'}`,
        debit: 0,
        credit: paymentAmount,
      },
    ];

    await this.accountMovesService.createAndPostMove({
      journalId: paymentJournal.id,
      partnerId: invoice.customerId,
      ref: `${invoice.invoiceNumber} - ${memo}`,
      date: paymentDate,
      moveType: AccountMoveType.IN_PAYMENT,
      lines: paymentMoveLines,
    });

    const newResidual = Math.max(
      0,
      Math.round((Number(invoice.residualAmount) - paymentAmount) * 100) / 100,
    );
    invoice.residualAmount = newResidual;

    if (newResidual <= 0.01) {
      invoice.state = CustomerInvoiceState.PAID;
    }

    await this.invoiceRepo.save(invoice);
    return this.findOne(id);
  }

  async findAll(query: CustomerInvoiceQueryDto, companyId?: string): Promise<any> {
    const { state, customerId, search, limit = 50, offset = 0 } = query;
    const qb = this.invoiceRepo
      .createQueryBuilder('inv')
      .leftJoinAndSelect('inv.customer', 'customer')
      .leftJoinAndSelect('inv.division', 'division')
      .leftJoinAndSelect('inv.warehouse', 'warehouse')
      .leftJoinAndSelect('inv.journal', 'journal')
      .leftJoinAndSelect('inv.lines', 'lines')
      .leftJoinAndSelect('lines.product', 'product')
      .leftJoinAndSelect('lines.tax', 'tax')
      .orderBy('inv.createdAt', 'DESC')
      .take(limit)
      .skip(offset);

    if (companyId) {
      qb.andWhere('(inv.companyId = :companyId OR inv.companyId IS NULL)', {
        companyId,
      });
    }

    if (state) {
      qb.andWhere('inv.state = :state', { state });
    }

    if (customerId) {
      qb.andWhere('inv.customerId = :customerId', { customerId });
    }

    if (search && search.trim()) {
      const q = `%${search.trim().toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(inv.invoiceNumber) LIKE :q OR LOWER(customer.name) LIKE :q OR LOWER(inv.sourceDocument) LIKE :q)',
        { q },
      );
    }

    const [items, total] = await qb.getManyAndCount();
    return { items, total, limit, offset };
  }

  async findOne(id: string): Promise<CustomerInvoice> {
    const invoice = await this.invoiceRepo.findOne({
      where: { id },
      relations: [
        'customer',
        'warehouse',
        'division',
        'journal',
        'lines',
        'lines.product',
        'lines.tax',
        'accountMove',
        'accountMove.lines',
        'accountMove.lines.account',
      ],
    });

    if (!invoice) {
      throw new NotFoundException(`Customer Invoice #${id} not found`);
    }

    return invoice;
  }

  async update(id: string, dto: any): Promise<CustomerInvoice> {
    const invoice = await this.findOne(id);
    if (invoice.state !== CustomerInvoiceState.DRAFT) {
      throw new BadRequestException('Cannot edit a non-draft customer invoice');
    }

    if (dto.customerId) invoice.customerId = dto.customerId;
    if (dto.customerName) invoice.customerName = dto.customerName;
    if (dto.customerAddress) invoice.customerAddress = dto.customerAddress;
    if (dto.deliveryAddress) invoice.deliveryAddress = dto.deliveryAddress;
    if (dto.warehouseId) invoice.warehouseId = dto.warehouseId;
    if (dto.divisionId) invoice.divisionId = dto.divisionId;
    if (dto.invoiceDate) invoice.invoiceDate = new Date(dto.invoiceDate);
    if (dto.dueDate) invoice.dueDate = new Date(dto.dueDate);
    if (dto.notes !== undefined) invoice.notes = dto.notes;
    if (dto.sourceDocument !== undefined) invoice.sourceDocument = dto.sourceDocument;

    if (Array.isArray(dto.lines)) {
      await this.lineRepo.delete({ invoiceId: id });
      let amountUntaxed = 0;
      let amountTax = 0;
      const newLines: CustomerInvoiceLine[] = [];

      for (const l of dto.lines) {
        const qty = Number(l.quantity || 1);
        const unitPrice = Number(l.unitPrice || 0);
        const subtotal = Math.round(qty * unitPrice * 100) / 100;
        const taxAmount = Number(l.taxAmount || 0);
        amountUntaxed += subtotal;
        amountTax += taxAmount;

        const line = this.lineRepo.create({
          invoiceId: invoice.id,
          invoice: { id: invoice.id } as any,
          productId: l.productId,
          description: l.description || 'Sales item',
          quantity: qty,
          unitPrice,
          discount: Number(l.discount || 0),
          taxId: l.taxId,
          taxAmount,
          subtotal,
        });
        newLines.push(line);
      }

      const savedLines = await this.lineRepo.save(newLines);
      invoice.lines = savedLines;
      invoice.amountUntaxed = Math.round(amountUntaxed * 100) / 100;
      invoice.amountTax = Math.round(amountTax * 100) / 100;
      invoice.amountTotal = Math.round((amountUntaxed + amountTax) * 100) / 100;
      invoice.residualAmount = invoice.amountTotal;
    }

    await this.invoiceRepo.save(invoice);
    return this.findOne(id);
  }

  async getStats(companyId?: string): Promise<any> {
    const qb = this.invoiceRepo.createQueryBuilder('inv');
    if (companyId) {
      qb.where('(inv.companyId = :companyId OR inv.companyId IS NULL)', {
        companyId,
      });
    }

    const invoices = await qb.getMany();
    const totalInvoices = invoices.length;
    let draft = 0;
    let open = 0;
    let paid = 0;
    let totalReceivable = 0;

    for (const inv of invoices) {
      if (inv.state === CustomerInvoiceState.DRAFT) draft++;
      else if (inv.state === CustomerInvoiceState.OPEN) {
        open++;
        totalReceivable += Number(inv.residualAmount || 0);
      } else if (inv.state === CustomerInvoiceState.PAID) paid++;
    }

    return {
      totalInvoices,
      draft,
      open,
      paid,
      totalReceivable: Math.round(totalReceivable * 100) / 100,
    };
  }

  async cancelInvoice(id: string): Promise<CustomerInvoice> {
    const invoice = await this.findOne(id);
    if (invoice.state === CustomerInvoiceState.PAID) {
      throw new BadRequestException('Cannot cancel an already paid invoice');
    }

    invoice.state = CustomerInvoiceState.CANCELLED;
    return this.invoiceRepo.save(invoice);
  }
}

