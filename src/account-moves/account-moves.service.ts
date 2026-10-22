import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AccountJournalsService } from "../account-journals/account-journals.service";
import { AccountMoveQueryDto } from "./dto/account-move-query.dto";
import { AccountMoveLine } from "./entities/account-move-line.entity";
import { AccountMove } from "./entities/account-move.entity";
import { AccountMoveState, AccountMoveType } from "./enums/account-move.enum";

export interface CreateMoveLineInput {
  accountId: string;
  partnerId?: string;
  name?: string;
  debit: number;
  credit: number;
}

export interface CreateMoveInput {
  journalId: string;
  partnerId?: string;
  ref?: string;
  date?: Date;
  moveType?: AccountMoveType;
  lines: CreateMoveLineInput[];
}

@Injectable()
export class AccountMovesService {
  constructor(
    @InjectRepository(AccountMove)
    private readonly moveRepo: Repository<AccountMove>,
    @InjectRepository(AccountMoveLine)
    private readonly lineRepo: Repository<AccountMoveLine>,
    private readonly journalsService: AccountJournalsService,
  ) {}

  async createAndPostMove(
    input: CreateMoveInput,
    preferredName?: string,
  ): Promise<AccountMove> {
    const journal = await this.journalsService.findOne(input.journalId);

    // Validate debit == credit
    let totalDebit = 0;
    let totalCredit = 0;
    for (const l of input.lines) {
      totalDebit = Math.round((totalDebit + Number(l.debit || 0)) * 100) / 100;
      totalCredit =
        Math.round((totalCredit + Number(l.credit || 0)) * 100) / 100;
    }

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new BadRequestException(
        `Journal entry is unbalanced: Total Debit (${totalDebit}) does not equal Total Credit (${totalCredit})`,
      );
    }

    const moveName = preferredName || (await this.generateMoveNumber(journal.code));

    const move = this.moveRepo.create({
      name: moveName,
      journalId: journal.id,
      moveType: input.moveType || AccountMoveType.ENTRY,
      state: AccountMoveState.POSTED,
      date: input.date || new Date(),
      ref: input.ref,
      partnerId: input.partnerId,
      amountTotal: totalDebit,
    });

    const savedMove = await this.moveRepo.save(move);

    const lines = input.lines.map((l) =>
      this.lineRepo.create({
        moveId: savedMove.id,
        accountId: l.accountId,
        partnerId: l.partnerId || input.partnerId,
        name: l.name,
        debit: Number(l.debit || 0),
        credit: Number(l.credit || 0),
      }),
    );

    await this.lineRepo.save(lines);

    return this.findOne(savedMove.id);
  }

  async findAll(query: AccountMoveQueryDto) {
    const {
      page = 1,
      limit = 20,
      state,
      moveType,
      journalId,
      partnerId,
      dateFrom,
      dateTo,
    } = query;

    const qb = this.moveRepo
      .createQueryBuilder("move")
      .leftJoinAndSelect("move.journal", "journal")
      .leftJoinAndSelect("move.partner", "partner")
      .leftJoinAndSelect("move.lines", "lines")
      .leftJoinAndSelect("lines.account", "account");

    if (state) {
      qb.andWhere("move.state = :state", { state });
    }
    if (moveType) {
      qb.andWhere("move.moveType = :moveType", { moveType });
    }
    if (journalId) {
      qb.andWhere("move.journalId = :journalId", { journalId });
    }
    if (partnerId) {
      qb.andWhere("move.partnerId = :partnerId", { partnerId });
    }
    if (dateFrom) {
      qb.andWhere("move.date >= :dateFrom", { dateFrom });
    }
    if (dateTo) {
      qb.andWhere("move.date <= :dateTo", { dateTo });
    }

    qb.orderBy("move.date", "DESC")
      .addOrderBy("move.createdAt", "DESC")
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();
    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<AccountMove> {
    const move = await this.moveRepo.findOne({
      where: { id },
      relations: ["journal", "partner", "lines", "lines.account", "lines.partner"],
    });
    if (!move) {
      throw new NotFoundException(`Journal entry with ID '${id}' not found`);
    }
    return move;
  }

  async getPartnerLedger(partnerId: string) {
    const lines = await this.lineRepo.find({
      where: { partnerId },
      relations: ["move", "account", "partner"],
      order: { createdAt: "ASC" },
    });

    let totalDebit = 0;
    let totalCredit = 0;
    for (const l of lines) {
      totalDebit += Number(l.debit);
      totalCredit += Number(l.credit);
    }

    return {
      partnerId,
      totalDebit: Math.round(totalDebit * 100) / 100,
      totalCredit: Math.round(totalCredit * 100) / 100,
      balance: Math.round((totalDebit - totalCredit) * 100) / 100,
      lines,
    };
  }

  async generateMoveName(journalCode: string): Promise<string> {
    return this.generateMoveNumber(journalCode);
  }

  async generateMoveNumber(journalCode: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `${journalCode}/${year}/`;
    const count = await this.moveRepo
      .createQueryBuilder("move")
      .where("move.name LIKE :prefix", { prefix: `${prefix}%` })
      .getCount();
    const nextSeq = String(count + 1).padStart(5, "0");
    return `${prefix}${nextSeq}`;
  }
}
