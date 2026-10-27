import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AccountAccountsService } from "../account-accounts/account-accounts.service";
import { AccountType } from "../account-accounts/enums/account-account.enum";
import { AccountJournal } from "../account-journals/entities/account-journal.entity";
import { AccountJournalType } from "../account-journals/enums/account-journal.enum";
import { AccountMovesService } from "../account-moves/account-moves.service";
import { AccountMove } from "../account-moves/entities/account-move.entity";
import { AccountMoveLine } from "../account-moves/entities/account-move-line.entity";
import {
  AccountMoveState,
  AccountMoveType,
} from "../account-moves/enums/account-move.enum";
import { Paginated } from "../common/dto/pagination-query.dto";
import { Partner } from "../partners/entities/partner.entity";
import { Warehouse } from "../warehouses/entities/warehouse.entity";
import { RegisterPaymentDto } from "./dto/register-payment.dto";
import { UpdateVendorBillDto } from "./dto/update-vendor-bill.dto";
import { VendorBillQueryDto } from "./dto/vendor-bill-query.dto";
import { VendorBillLine } from "./entities/vendor-bill-line.entity";
import { VendorBill } from "./entities/vendor-bill.entity";
import { VendorBillState } from "./enums/vendor-bill.enum";

@Injectable()
export class VendorBillsService {
  constructor(
    @InjectRepository(VendorBill)
    private readonly repo: Repository<VendorBill>,
    @InjectRepository(VendorBillLine)
    private readonly lineRepo: Repository<VendorBillLine>,
    @InjectRepository(AccountJournal)
    private readonly journalRepo: Repository<AccountJournal>,
    @InjectRepository(AccountMoveLine)
    private readonly moveLineRepo: Repository<AccountMoveLine>,
    @InjectRepository(Partner)
    private readonly partnerRepo: Repository<Partner>,
    private readonly accountAccountsService: AccountAccountsService,
    private readonly accountMovesService: AccountMovesService,
  ) {}

  async onModuleInit() {
    try {
      await this.repo.query(`ALTER TABLE vendor_bills ALTER COLUMN bill_number DROP NOT NULL;`);
    } catch {}
  }

  async generateBillNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const result = await this.repo.manager.query(
      `SELECT COALESCE(MAX(seq), 0) as max_seq FROM (
        SELECT CAST(SUBSTRING(bill_number FROM 'BILL/\\d{4}/(\\d+)') AS INTEGER) AS seq 
        FROM vendor_bills 
        WHERE bill_number LIKE 'BILL/${year}/%'
        UNION
        SELECT CAST(SUBSTRING(name FROM 'BILL/\\d{4}/(\\d+)') AS INTEGER) AS seq 
        FROM account_moves 
        WHERE name LIKE 'BILL/${year}/%'
      ) t`
    );
    const maxSeq = result && result[0] ? Number(result[0].max_seq) : 0;
    let nextSeq = maxSeq + 1;
    let candidate = `BILL/${year}/${String(nextSeq).padStart(5, "0")}`;
    while (
      (await this.repo.findOne({ where: { billNumber: candidate } })) ||
      (await this.repo.manager.getRepository(AccountMove).findOne({ where: { name: candidate } }))
    ) {
      nextSeq++;
      candidate = `BILL/${year}/${String(nextSeq).padStart(5, "0")}`;
    }
    return candidate;
  }

  formatVendorAddress(vendor: any): string {
    if (!vendor) return "No address provided";
    const parts = [
      vendor.street,
      vendor.street2,
      vendor.city,
      vendor.state,
      vendor.zip,
      vendor.country,
    ].filter(Boolean);
    return parts.join(", ") || "No address provided";
  }

  /**
   * Step 1: Create Vendor Bill in DRAFT state
   * Mirrors Odoo: At draft state, only account.invoice & lines exist.
   * No journal entry (account.move) is created yet, Balance Sheet / P&L unaffected.
   */
  async createFromPurchaseOrder(po: any): Promise<VendorBill> {
    const vendorAddress = this.formatVendorAddress(po.vendor);

    // Find default Purchase journal (BILL)
    let journal = await this.journalRepo.findOne({
      where: { code: "BILL" },
    });
    if (!journal) {
      journal = await this.journalRepo.findOne({
        where: { type: AccountJournalType.PURCHASE },
      });
    }
    if (!journal) {
      journal = (await this.journalRepo.save(
        this.journalRepo.create({
          name: "Vendor Bills",
          code: "BILL",
          type: AccountJournalType.PURCHASE,
        }),
      )) as any;
    }

    const amountUntaxed = Number(po.amountUntaxed || 0);
    const amountTax = Number(po.amountTax || 0);
    const amountTotal = Number(po.amountTotal || 0);

    const wh = po.warehouse;
    let deliverTo: string | null = null;
    let deliveryAddress: string | null = null;
    if (wh) {
      const whCode = wh.code ? ` (${wh.code}: Receipts)` : `: Receipts`;
      deliverTo = `${wh.name || "Warehouse"}${whCode}`;
      const whParts = [wh.address, wh.city, wh.country].filter(Boolean);
      deliveryAddress = whParts.length > 0 ? whParts.join(", ") : null;
    }

    const bill = this.repo.create({
      billNumber: null as any,
      journalId: journal?.id,
      vendorId: po.vendorId,
      vendorName: po.vendor?.name ?? "Unknown Vendor",
      vendorAddress,
      deliverTo,
      deliveryAddress,
      warehouseId: po.warehouseId,
      divisionId: po.divisionId,
      companyId: po.companyId,
      currency: po.currency || "INR",
      receiptDate: new Date(),
      invoiceDate: new Date(),
      dueDate: po.deliveryDate ? new Date(po.deliveryDate) : new Date(),
      sourceDocument: po.name,
      purchaseOrderId: po.id,
      state: VendorBillState.DRAFT, // Draft stage
      amountUntaxed,
      amountTax,
      amountTotal,
      residualAmount: amountTotal, // Full amount due initially
      notes: po.notes,
    });

    const savedBill = await this.repo.save(bill);

    if (po.lines && po.lines.length > 0) {
      const billLines = po.lines.map((l: any) =>
        this.lineRepo.create({
          billId: savedBill.id,
          bill: { id: savedBill.id } as any,
          productId: l.productId,
          description: l.description || l.product?.name || "Adhoc item",
          quantity: Number(l.quantity || 1),
          unitPrice: Number(l.unitPrice || 0),
          uomId: l.uomId,
          taxId: l.taxId,
          taxAmount: Number(l.taxAmount || 0),
          subtotal: Number(l.subtotal || 0),
        }),
      );
      await this.lineRepo.save(billLines);
    }

    return this.findOne(savedBill.id);
  }

  /**
   * Step 2: Validate Bill (Odoo: action_invoice_open / validate)
   * Automatically creates the balanced account.move and account.move.line entries:
   *   Dr Expense Account        $240.00
   *   Dr Tax Account (Input Tax) $43.20
   *   Cr Accounts Payable       $283.20 (Partner = Vendor)
   * Debit == Credit (Balanced!)
   * State transitions: DRAFT -> OPEN
   */
  async validateBill(id: string): Promise<VendorBill> {
    const bill = await this.findOne(id);
    if (bill.state !== VendorBillState.DRAFT) {
      throw new BadRequestException(
        `Cannot validate bill in "${bill.state}" state (must be draft)`,
      );
    }

    // Generate official Bill Sequence Number upon validation (Odoo style)
    if (
      !bill.billNumber ||
      bill.billNumber === "DRAFT" ||
      bill.billNumber.startsWith("DRAFT") ||
      (await this.repo.manager.getRepository(AccountMove).findOne({ where: { name: bill.billNumber } }))
    ) {
      bill.billNumber = await this.generateBillNumber();
    }

    // Ensure default accounts exist in chart of accounts
    const expenseAccount = await this.accountAccountsService.findOrCreateDefault(
      "500000",
      "Operating Expenses / Purchases",
      AccountType.EXPENSE,
    );
    const taxAccount = await this.accountAccountsService.findOrCreateDefault(
      "131000",
      "Input Tax Credit (GST/VAT)",
      AccountType.TAX,
    );

    let payableAccount: any = null;
    const partnerPayableId =
      bill.vendor?.accountPayableId || bill.vendor?.accountPayable?.id;
    if (partnerPayableId) {
      payableAccount = await this.accountAccountsService
        .findOne(partnerPayableId)
        .catch(() => null);
    }
    if (!payableAccount) {
      payableAccount = await this.accountAccountsService.findOrCreateDefault(
        "211000",
        "Accounts Payable (Sundry Creditors)",
        AccountType.PAYABLE,
        true,
      );
    }

    // Ensure journal is assigned
    let journalId = bill.journalId;
    if (!journalId) {
      let journal =
        (await this.journalRepo.findOne({ where: { code: "BILL" } })) ||
        (await this.journalRepo.findOne({
          where: { type: AccountJournalType.PURCHASE },
        }));
      if (!journal) {
        journal = (await this.journalRepo.save(
          this.journalRepo.create({
            name: "Vendor Bills",
            code: "BILL",
            type: AccountJournalType.PURCHASE,
          }),
        )) as any;
      }
      journalId = journal?.id;
      bill.journalId = journalId;
    }

    const untaxed = Number(bill.amountUntaxed);
    const tax = Number(bill.amountTax);
    const total = Number(bill.amountTotal);

    const moveLines = [
      // Line 1: Dr Expense (Company expense increases)
      {
        accountId: expenseAccount.id,
        partnerId: bill.vendorId,
        name: `Expense: ${bill.notes || bill.sourceDocument || "Purchases / Adhoc"}`,
        debit: untaxed,
        credit: 0,
      },
    ];

    // Line 2: Dr Tax (Input tax credit receivable from government)
    if (tax > 0) {
      moveLines.push({
        accountId: taxAccount.id,
        partnerId: bill.vendorId,
        name: `Input Tax Credit on ${bill.billNumber}`,
        debit: tax,
        credit: 0,
      });
    }

    // Line 3: Cr Accounts Payable (Amount owed to vendor)
    moveLines.push({
      accountId: payableAccount.id,
      partnerId: bill.vendorId,
      name: `Accounts Payable: ${bill.vendorName || "Vendor"}`,
      debit: 0,
      credit: total,
    });

    // Create and post balanced Journal Entry (account.move)
    const move = await this.accountMovesService.createAndPostMove(
      {
        journalId,
        partnerId: bill.vendorId,
        ref: `${bill.billNumber} (${bill.sourceDocument || ""})`.trim(),
        date: bill.invoiceDate || new Date(),
        moveType: AccountMoveType.IN_INVOICE,
        lines: moveLines,
      },
      bill.billNumber,
    );

    // Update bill
    bill.accountMoveId = move.id;
    bill.state = VendorBillState.OPEN;
    bill.residualAmount = total;
    await this.repo.save(bill);

    return this.findOne(id);
  }

  /**
   * Step 3: Register Payment (Odoo: action_register_payment)
   * Automatically generates the Payment Journal Entry (account.move):
   *   Dr Accounts Payable       $283.20 (Partner = Vendor)
   *   Cr Bank / Cash Account    $283.20
   * Reconciles both account.move.line records!
   * Residual decreases, and once residual == 0, bill state -> PAID
   */
  async registerPayment(
    id: string,
    dto: RegisterPaymentDto,
  ): Promise<VendorBill> {
    const bill = await this.findOne(id);
    if (bill.state !== VendorBillState.OPEN) {
      throw new BadRequestException(
        `Cannot register payment for bill in "${bill.state}" state (must be open)`,
      );
    }

    const paymentAmount = Number(
      Number(dto.amount ?? bill.residualAmount).toFixed(4),
    );
    if (paymentAmount <= 0) {
      throw new BadRequestException("Payment amount must be greater than zero");
    }
    if (paymentAmount > Number(bill.residualAmount) + 0.01) {
      throw new BadRequestException(
        `Payment amount (${paymentAmount}) cannot exceed residual amount (${bill.residualAmount})`,
      );
    }

    // Verify payment journal (Bank or Cash)
    const journal = await this.journalRepo.findOne({
      where: { id: dto.journalId },
    });
    if (!journal) {
      throw new NotFoundException(`Payment journal ${dto.journalId} not found`);
    }

    const isBank = journal.type === AccountJournalType.BANK;
    const liquidityAccount = await this.accountAccountsService.findOrCreateDefault(
      isBank ? "101000" : "102000",
      isBank ? "Bank Account" : "Cash Account",
      isBank ? AccountType.BANK : AccountType.CASH,
    );

    let payableAccount: any = null;
    const partnerPayableId =
      bill.vendor?.accountPayableId || bill.vendor?.accountPayable?.id;
    if (partnerPayableId) {
      payableAccount = await this.accountAccountsService
        .findOne(partnerPayableId)
        .catch(() => null);
    }
    if (!payableAccount) {
      payableAccount = await this.accountAccountsService.findOrCreateDefault(
        "211000",
        "Accounts Payable (Sundry Creditors)",
        AccountType.PAYABLE,
        true,
      );
    }

    const paymentMoveName = await this.accountMovesService.generateMoveName(
      journal.code || "BNK",
    );

    // Payment Journal Entry lines:
    // 1. Dr Accounts Payable (reduces liability to vendor)
    // 2. Cr Bank/Cash (reduces cash/bank balance)
    const paymentMoveLines = [
      {
        accountId: payableAccount.id,
        partnerId: bill.vendorId,
        name: `Payment of ${bill.billNumber} ${dto.reference ? `(${dto.reference})` : ""}`.trim(),
        debit: paymentAmount,
        credit: 0,
      },
      {
        accountId: liquidityAccount.id,
        partnerId: undefined,
        name: `${journal.name} Payment for ${bill.vendorName}`,
        debit: 0,
        credit: paymentAmount,
      },
    ];

    const paymentMove = await this.accountMovesService.createAndPostMove(
      {
        journalId: journal.id,
        partnerId: bill.vendorId,
        ref: `Payment: ${bill.billNumber} ${dto.reference || ""}`.trim(),
        date: dto.paymentDate ? new Date(dto.paymentDate) : new Date(),
        moveType: AccountMoveType.OUT_PAYMENT,
        lines: paymentMoveLines,
      },
      paymentMoveName,
    );

    // --- RECONCILIATION ENGINE ---
    // 1. Find the payable credit line from the Bill's move
    let billPayableLine: AccountMoveLine | null = null;
    if (bill.accountMoveId) {
      billPayableLine = await this.moveLineRepo.findOne({
        where: {
          moveId: bill.accountMoveId,
          partnerId: bill.vendorId,
          reconciled: false,
        },
      });
    }

    // 2. Find the payable debit line from this Payment move
    const paymentPayableLine = await this.moveLineRepo.findOne({
      where: {
        moveId: paymentMove.id,
        partnerId: bill.vendorId,
      },
    });

    // 3. Mark both reconciled & cross-linked
    if (billPayableLine && paymentPayableLine) {
      billPayableLine.reconciled = true;
      billPayableLine.matchedLineId = paymentPayableLine.id;
      paymentPayableLine.reconciled = true;
      paymentPayableLine.matchedLineId = billPayableLine.id;
      await this.moveLineRepo.save([billPayableLine, paymentPayableLine]);
    }

    // Update residual amount
    const newResidual = Number(
      Math.max(0, Number(bill.residualAmount) - paymentAmount).toFixed(4),
    );
    bill.residualAmount = newResidual;

    if (newResidual <= 0.001) {
      bill.state = VendorBillState.PAID;
    }

    await this.repo.save(bill);
    return this.findOne(id);
  }

  async findAll(
    query: VendorBillQueryDto & { companyId?: string },
    companyId?: string,
  ): Promise<Paginated<VendorBill>> {
    const {
      page,
      limit,
      search,
      state,
      vendorId,
      divisionId,
      warehouseId,
      purchaseOrderId,
      active,
    } = query;

    const effectiveCompanyId = companyId || query?.companyId;

    const queryBuilder = this.repo
      .createQueryBuilder("bill")
      .leftJoinAndSelect("bill.vendor", "vendor")
      .leftJoinAndSelect("bill.division", "division")
      .leftJoinAndSelect("bill.warehouse", "warehouse")
      .leftJoinAndSelect("bill.journal", "journal")
      .leftJoinAndSelect("bill.accountMove", "accountMove")
      .leftJoinAndSelect("accountMove.journal", "moveJournal")
      .leftJoinAndSelect("accountMove.lines", "accountMoveLines")
      .leftJoinAndSelect("accountMoveLines.account", "moveLineAccount")
      .leftJoinAndSelect("accountMoveLines.partner", "moveLinePartner")
      .leftJoinAndSelect("bill.lines", "lines")
      .leftJoinAndSelect("lines.product", "product")
      .leftJoinAndSelect("lines.tax", "tax")
      .leftJoinAndSelect("lines.uom", "uom");

    if (effectiveCompanyId) {
      queryBuilder.andWhere("bill.companyId = :companyId", { companyId: effectiveCompanyId });
    }
    if (active !== undefined) {
      queryBuilder.andWhere("bill.active = :active", { active });
    }
    if (state) {
      queryBuilder.andWhere("bill.state = :state", { state });
    }
    if (vendorId) {
      queryBuilder.andWhere("bill.vendorId = :vendorId", { vendorId });
    }
    if (divisionId) {
      queryBuilder.andWhere("bill.divisionId = :divisionId", { divisionId });
    }
    if (warehouseId) {
      queryBuilder.andWhere("bill.warehouseId = :warehouseId", { warehouseId });
    }
    if (purchaseOrderId) {
      queryBuilder.andWhere("bill.purchaseOrderId = :purchaseOrderId", {
        purchaseOrderId,
      });
    }
    if (search) {
      queryBuilder.andWhere(
        "(bill.billNumber ILIKE :search OR bill.invoiceNumber ILIKE :search OR bill.deliverTo ILIKE :search OR bill.vendorName ILIKE :search OR bill.sourceDocument ILIKE :search)",
        { search: `%${search}%` },
      );
    }

    queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy("bill.createdAt", "DESC");

    const [data, total] = await queryBuilder.getManyAndCount();
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string): Promise<VendorBill> {
    const bill = await this.repo.findOne({
      where: { id },
      relations: [
        "vendor",
        "vendor.accountPayable",
        "division",
        "warehouse",
        "journal",
        "accountMove",
        "accountMove.journal",
        "accountMove.lines",
        "accountMove.lines.account",
        "accountMove.lines.partner",
        "lines",
        "lines.product",
        "lines.tax",
        "lines.uom",
      ],
    });
    if (!bill) throw new NotFoundException(`Vendor Bill ${id} not found`);
    return bill;
  }

  async update(id: string, dto: UpdateVendorBillDto): Promise<VendorBill> {
    const bill = await this.findOne(id);
    if (bill.state !== VendorBillState.DRAFT) {
      throw new BadRequestException("Only draft bills can be edited");
    }

    if (dto.vendorId && dto.vendorId !== bill.vendorId) {
      const vendor = await this.partnerRepo.findOne({
        where: { id: dto.vendorId },
      });
      if (vendor) {
        bill.vendorId = vendor.id;
        bill.vendorName = vendor.name;
        bill.vendorAddress = this.formatVendorAddress(vendor);
      }
    } else if (dto.vendorName !== undefined) {
      bill.vendorName = dto.vendorName;
    }

    if (dto.invoiceDate !== undefined) {
      bill.invoiceDate = new Date(dto.invoiceDate);
    }
    if (dto.dueDate !== undefined) {
      bill.dueDate = new Date(dto.dueDate);
    }
    if (dto.sourceDocument !== undefined) {
      bill.sourceDocument = dto.sourceDocument;
    }
    if (dto.warehouseId !== undefined) {
      bill.warehouseId = dto.warehouseId;
      if (dto.warehouseId) {
        const whRepo = this.repo.manager.getRepository(Warehouse);
        const wh = await whRepo.findOne({ where: { id: dto.warehouseId } });
        if (wh) {
          if (!dto.deliverTo) {
            const whCode = wh.code ? ` (${wh.code}: Receipts)` : `: Receipts`;
            bill.deliverTo = `${wh.name || "Warehouse"}${whCode}`;
          }
          if (!dto.deliveryAddress) {
            const whParts = [wh.address, wh.city, wh.country].filter(Boolean);
            if (whParts.length > 0) {
              bill.deliveryAddress = whParts.join(", ");
            }
          }
        }
      }
    }
    if (dto.journalId !== undefined) {
      bill.journalId = dto.journalId;
    }
    if (dto.notes !== undefined) {
      bill.notes = dto.notes;
    }
    if (dto.invoiceNumber !== undefined) {
      bill.invoiceNumber = dto.invoiceNumber;
    }
    if (dto.deliverTo !== undefined) {
      bill.deliverTo = dto.deliverTo;
    }
    if (dto.deliveryAddress !== undefined) {
      bill.deliveryAddress = dto.deliveryAddress;
    }
    if (dto.receiptDate !== undefined) {
      bill.receiptDate = dto.receiptDate ? new Date(dto.receiptDate) : null;
    }
    if (dto.divisionId !== undefined) {
      bill.divisionId = dto.divisionId;
    }


    if (dto.lines) {
      await this.lineRepo.delete({ billId: id });

      let amountUntaxed = 0;
      let amountTax = 0;

      const newLines = dto.lines.map((l) => {
        const quantity = Number(l.quantity || 1);
        const unitPrice = Number(l.unitPrice || 0);
        const subtotal = Number((quantity * unitPrice).toFixed(4));
        const taxAmount = Number(l.taxAmount || 0);

        amountUntaxed += subtotal;
        amountTax += taxAmount;

        return this.lineRepo.create({
          billId: id,
          bill: { id } as any,
          productId: l.productId,
          description: l.description,
          quantity,
          unitPrice,
          uomId: l.uomId,
          taxId: l.taxId,
          taxAmount,
          subtotal,
        });
      });

      const savedLines = await this.lineRepo.save(newLines);
      bill.lines = savedLines;

      const amountTotal = Number((amountUntaxed + amountTax).toFixed(4));
      bill.amountUntaxed = amountUntaxed;
      bill.amountTax = amountTax;
      bill.amountTotal = amountTotal;
      bill.residualAmount = amountTotal;
    }

    await this.repo.save(bill);
    return this.findOne(id);
  }

  async cancelBill(id: string): Promise<VendorBill> {
    const bill = await this.findOne(id);
    if (bill.state === VendorBillState.PAID) {
      throw new BadRequestException("Paid bills cannot be cancelled");
    }
    bill.state = VendorBillState.CANCELLED;
    await this.repo.save(bill);
    return this.findOne(id);
  }
}
