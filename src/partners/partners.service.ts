import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CompanyType, Partner } from './entities/partner.entity';
import { CreatePartnerDto } from './dto/create-partner.dto';
import { UpdatePartnerDto } from './dto/update-partner.dto';
import { PartnerQueryDto } from './dto/partner-query.dto';
import { Paginated } from '../common/dto/pagination-query.dto';
import { AccountAccount } from '../account-accounts/entities/account-account.entity';
import { AccountType } from '../account-accounts/enums/account-account.enum';
import { Location, LocationUsage } from '../locations/entities/location.entity';

@Injectable()
export class PartnersService {
  constructor(
    @InjectRepository(Partner) private readonly repo: Repository<Partner>,
    @InjectRepository(AccountAccount) private readonly accountRepo: Repository<AccountAccount>,
    @InjectRepository(Location) private readonly locationRepo: Repository<Location>,
  ) {}

  private syncPartnerFields(dto: CreatePartnerDto | UpdatePartnerDto) {
    if (dto.companyType) {
      dto.isCompany = dto.companyType === CompanyType.COMPANY;
      if (dto.companyType === CompanyType.INDIVIDUAL) {
        dto.companyStructure = undefined;
      } else if (dto.companyType === CompanyType.COMPANY) {
        dto.parentId = undefined;
      }
    } else if (dto.isCompany !== undefined) {
      dto.companyType = dto.isCompany
        ? CompanyType.COMPANY
        : CompanyType.INDIVIDUAL;
      if (!dto.isCompany) {
        dto.companyStructure = undefined;
      } else {
        dto.parentId = undefined;
      }
    }

    if (dto.gstin) {
      dto.hasGstin = true;
      if (!dto.taxId) dto.taxId = dto.gstin;
    }

    if (dto.pan) {
      dto.hasPan = true;
    }
  }

  async create(dto: CreatePartnerDto, companyId?: string): Promise<Partner> {
    this.syncPartnerFields(dto);

    let effectiveCompanyId = companyId || (dto as any).companyId;
    if (!effectiveCompanyId) {
      const defaultComp = await this.repo.manager.query(
        `SELECT id FROM companies ORDER BY created_at DESC LIMIT 1`,
      );
      if (defaultComp && defaultComp[0]?.id) {
        effectiveCompanyId = defaultComp[0].id;
      }
    }

    // Auto-assign default accounting & location for Customer
    if (dto.isCustomer) {
      if (!dto.accountReceivableId && effectiveCompanyId) {
        const receivable = await this.accountRepo.findOne({
          where: [
            { code: '105001', companyId: effectiveCompanyId },
            { type: AccountType.RECEIVABLE, companyId: effectiveCompanyId },
          ],
        });
        if (receivable) {
          dto.accountReceivableId = receivable.id;
        }
      }
      if (!dto.customerLocationId && effectiveCompanyId) {
        const custLoc = await this.locationRepo.findOne({
          where: { usage: LocationUsage.CUSTOMER, companyId: effectiveCompanyId },
        });
        if (custLoc) {
          dto.customerLocationId = custLoc.id;
        }
      }
    }

    // Auto-assign default accounting & location for Vendor
    if (dto.isVendor) {
      if (!dto.accountPayableId && effectiveCompanyId) {
        const payable = await this.accountRepo.findOne({
          where: [
            { code: '205001', companyId: effectiveCompanyId },
            { type: AccountType.PAYABLE, companyId: effectiveCompanyId },
          ],
        });
        if (payable) {
          dto.accountPayableId = payable.id;
        }
      }
      if (!dto.vendorLocationId && effectiveCompanyId) {
        const vendLoc = await this.locationRepo.findOne({
          where: { usage: LocationUsage.VENDOR, companyId: effectiveCompanyId },
        });
        if (vendLoc) {
          dto.vendorLocationId = vendLoc.id;
        }
      }
    }

    const entity = this.repo.create({ ...dto, companyId: effectiveCompanyId });
    return this.repo.save(entity);
  }

  async findAll(
    query: PartnerQueryDto & { companyId?: string },
    kind?: 'customer' | 'vendor',
    companyId?: string,
  ): Promise<Paginated<Partner>> {
    const {
      page = 1,
      limit = 20,
      search,
      active = true,
      isCustomer,
      isVendor,
      companyType,
      parentId,
    } = query;

    const effectiveCompanyId = companyId || query?.companyId;

    const qb = this.repo
      .createQueryBuilder('partner')
      .leftJoinAndSelect('partner.parent', 'parent')
      .leftJoinAndSelect('partner.paymentTerm', 'paymentTerm')
      .leftJoinAndSelect('partner.pricelist', 'pricelist')
      .leftJoinAndSelect('partner.warehouse', 'warehouse')
      .leftJoinAndSelect('partner.customerLocation', 'customerLocation')
      .leftJoinAndSelect('partner.vendorLocation', 'vendorLocation')
      .leftJoinAndSelect('partner.accountReceivable', 'accountReceivable')
      .leftJoinAndSelect('partner.accountPayable', 'accountPayable');

    if (effectiveCompanyId) {
      qb.andWhere('partner.companyId = :companyId', { companyId: effectiveCompanyId });
    }

    if (active !== undefined) {
      qb.andWhere('partner.active = :active', { active });
    }

    // Filter by customer
    if (kind === 'customer' || isCustomer === true) {
      qb.andWhere('partner.isCustomer = :isCustomer', { isCustomer: true });
    }

    // Filter by vendor
    if (kind === 'vendor' || isVendor === true) {
      qb.andWhere('partner.isVendor = :isVendor', { isVendor: true });
      qb.andWhere('partner.odooPartnerId IS NULL');
    }

    // Filter by companyType
    if (companyType) {
      qb.andWhere('partner.companyType = :companyType', { companyType });
    }

    // Filter by parentId
    if (parentId) {
      qb.andWhere('partner.parentId = :parentId', { parentId });
    }

    if (search) {
      qb.andWhere(
        '(LOWER(partner.name) LIKE LOWER(:search) OR LOWER(partner.email) LIKE LOWER(:search) OR LOWER(partner.phone) LIKE LOWER(:search) OR LOWER(partner.gstin) LIKE LOWER(:search) OR LOWER(partner.pan) LIKE LOWER(:search) OR LOWER(partner.city) LIKE LOWER(:search))',
        { search: `%${search}%` },
      );
    }

    qb.orderBy('partner.name', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<Partner> {
    const entity = await this.repo.findOne({
      where: { id },
      relations: [
        'parent',
        'paymentTerm',
        'pricelist',
        'warehouse',
        'customerLocation',
        'vendorLocation',
        'accountReceivable',
        'accountPayable',
      ],
    });
    if (!entity) throw new NotFoundException(`Partner ${id} not found`);
    return entity;
  }

  async update(id: string, dto: UpdatePartnerDto): Promise<Partner> {
    const entity = await this.findOne(id);
    this.syncPartnerFields(dto);
    Object.assign(entity, dto);
    return this.repo.save(entity);
  }

  async remove(id: string): Promise<void> {
    const entity = await this.findOne(id);
    entity.active = false;
    await this.repo.save(entity);
  }
}
