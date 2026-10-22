import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { PaymentTerm, PaymentTermLine } from './entities/payment-term.entity';
import { CreatePaymentTermDto } from './dto/create-payment-term.dto';
import { UpdatePaymentTermDto } from './dto/update-payment-term.dto';
import {
  Paginated,
  PaginationQueryDto,
} from '../common/dto/pagination-query.dto';

@Injectable()
export class PaymentTermsService {
  constructor(
    @InjectRepository(PaymentTerm)
    private readonly repo: Repository<PaymentTerm>,
    @InjectRepository(PaymentTermLine)
    private readonly lineRepo: Repository<PaymentTermLine>,
  ) {}

  create(dto: CreatePaymentTermDto) {
    const entity = this.repo.create({
      name: dto.name,
      note: dto.note,
      lines: dto.lines?.map((l) => this.lineRepo.create(l)) ?? [],
    });
    return this.repo.save(entity);
  }

  async findAll(query: PaginationQueryDto): Promise<Paginated<PaymentTerm>> {
    const { page, limit, search, active } = query;
    const where: any = {};
    if (search) where.name = ILike(`%${search}%`);
    if (active !== undefined) where.active = active;

    const [data, total] = await this.repo.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: { name: 'ASC' },
    });
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException(`Payment Term ${id} not found`);
    return entity;
  }

  async update(id: string, dto: UpdatePaymentTermDto) {
    const entity = await this.findOne(id);
    entity.name = dto.name ?? entity.name;
    entity.note = dto.note ?? entity.note;

    if (dto.lines) {
      // Replace all lines: delete old, insert new (simplest strategy for a rules-based sub-resource)
      await this.lineRepo.delete({ paymentTermId: id });
      entity.lines = dto.lines.map((l) => this.lineRepo.create(l));
    }
    return this.repo.save(entity);
  }

  async remove(id: string) {
    const entity = await this.findOne(id);
    entity.active = false;
    await this.repo.save(entity);
  }
}
