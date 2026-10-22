import {
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserClassification } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import {
  Paginated,
  PaginationQueryDto,
} from '../common/dto/pagination-query.dto';

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(
    @InjectRepository(User) private readonly repo: Repository<User>,
  ) {}

  async onModuleInit() {
    try {
      // Safely drop any legacy single-column unique constraint on email
      await this.repo.query(`
        DO $$
        DECLARE
            r RECORD;
        BEGIN
            FOR r IN (
                SELECT conname
                FROM pg_constraint c
                JOIN pg_class t ON c.conrelid = t.oid
                JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey)
                WHERE t.relname = 'users' AND c.contype = 'u'
                GROUP BY c.conname, c.conkey
                HAVING count(*) = 1 AND bool_or(a.attname = 'email')
            ) LOOP
                EXECUTE 'ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "' || r.conname || '" CASCADE';
            END LOOP;
        END $$;
      `);
      // Ensure compound unique index (email, company_id) exists
      await this.repo.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS uq_users_email_company ON users (email, company_id);
      `);
      // Ensure is_admin column exists
      await this.repo.query(`
        ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_admin" boolean DEFAULT false;
      `);
    } catch {
      // Ignore if table or constraints do not exist yet
    }
  }

  async create(dto: CreateUserDto, companyId?: string): Promise<User> {
    const effectiveCompanyId = companyId || dto.companyId;
    const cleanEmail = dto.email.trim().toLowerCase();

    // Check if email already exists IN THIS COMPANY
    const whereExists: any = { email: cleanEmail };
    if (effectiveCompanyId) {
      whereExists.companyId = effectiveCompanyId;
    }
    const exists = await this.repo.findOne({ where: whereExists });
    if (exists) throw new ConflictException('Email already registered for this company');

    const hashed = await bcrypt.hash(dto.password, 10);
    const isAdmin = Boolean(dto.isAdmin);

    const managementRights = {
      sale: 'management',
      inventory: 'management',
      purchase: 'management',
      accounting: 'management',
    };

    const defaultRights = {
      sale: 'user',
      inventory: 'user',
      purchase: 'user',
      accounting: 'none',
    };

    const user = this.repo.create({
      ...dto,
      email: cleanEmail,
      companyId: effectiveCompanyId || undefined,
      password: hashed,
      userType: dto.userType || UserClassification.INTERNAL,
      isAdmin,
      accessRights: isAdmin ? managementRights : (dto.accessRights || defaultRights),
      active: dto.active !== undefined ? dto.active : true,
    });
    return this.repo.save(user);
  }

  async findAll(
    query: PaginationQueryDto & { companyId?: string },
    companyId?: string,
  ): Promise<Paginated<User>> {
    const page = Math.max(1, Number(query?.page) || 1);
    const limit = Math.max(1, Number(query?.limit) || 20);
    const { search, active } = query || {};
    const effectiveCompanyId = companyId || query?.companyId;

    let where: any;
    if (search) {
      const searchPattern = ILike(`%${search}%`);
      where = [
        {
          name: searchPattern,
          ...(effectiveCompanyId ? { companyId: effectiveCompanyId } : {}),
          ...(active !== undefined ? { active } : {}),
        },
        {
          email: searchPattern,
          ...(effectiveCompanyId ? { companyId: effectiveCompanyId } : {}),
          ...(active !== undefined ? { active } : {}),
        },
      ];
    } else {
      where = {};
      if (active !== undefined) where.active = active;
      if (effectiveCompanyId) where.companyId = effectiveCompanyId;
    }

    const [data, total] = await this.repo.findAndCount({
      where,
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'ASC' },
      relations: ['role', 'company'],
    });
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string, companyId?: string): Promise<User> {
    const where: any = { id };
    if (companyId) where.companyId = companyId;
    const user = await this.repo.findOne({
      where,
      relations: ['role', 'company'],
    });
    if (!user) throw new NotFoundException(`User ${id} not found`);

    if (user.role?.name === 'admin' || user.userType === 'company_admin') {
      user.isAdmin = true;
    }
    if (!user.accessRights && user.isAdmin) {
      user.accessRights = {
        sale: 'management',
        inventory: 'management',
        purchase: 'management',
        accounting: 'management',
      };
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repo.findOne({ where: { email }, relations: ['role', 'company'] });
  }

  async update(id: string, dto: UpdateUserDto, companyId?: string): Promise<User> {
    const where: any = { id };
    if (companyId) where.companyId = companyId;

    const user = await this.repo.findOne({ where, relations: ['role', 'company'] });
    if (!user) throw new NotFoundException(`User ${id} not found`);

    if (dto.email && dto.email.trim().toLowerCase() !== user.email) {
      const cleanEmail = dto.email.trim().toLowerCase();
      const effectiveCompanyId = companyId || user.companyId;
      const whereCheck: any = { email: cleanEmail };
      if (effectiveCompanyId) whereCheck.companyId = effectiveCompanyId;
      const exists = await this.repo.findOne({ where: whereCheck });
      if (exists && exists.id !== id) {
        throw new ConflictException('Email already registered for this company');
      }
      user.email = cleanEmail;
    }

    if (dto.password) {
      user.password = await bcrypt.hash(dto.password, 10);
    }
    if (dto.name !== undefined) user.name = dto.name;
    if (dto.phone !== undefined) user.phone = dto.phone;
    if (dto.userType !== undefined) user.userType = dto.userType;
    if (dto.isAdmin !== undefined) {
      user.isAdmin = dto.isAdmin;
      if (dto.isAdmin && !dto.accessRights) {
        user.accessRights = {
          sale: 'management',
          inventory: 'management',
          purchase: 'management',
          accounting: 'management',
        };
      }
    }
    if (dto.accessRights !== undefined) {
      user.accessRights = { ...(user.accessRights || {}), ...dto.accessRights };
    }
    if (dto.roleId !== undefined) user.roleId = dto.roleId;
    if (dto.active !== undefined) user.active = dto.active;

    return this.repo.save(user);
  }

  async changePassword(id: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.findOne(id);
    const match = await bcrypt.compare(dto.currentPassword, user.password);
    if (!match) throw new UnauthorizedException('Current password is incorrect');
    user.password = await bcrypt.hash(dto.newPassword, 10);
    await this.repo.save(user);
  }

  async remove(id: string, companyId?: string): Promise<void> {
    const where: any = { id };
    if (companyId) where.companyId = companyId;
    const user = await this.repo.findOne({ where });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    user.active = false;
    await this.repo.save(user);
  }

  async touchLastLogin(id: string): Promise<void> {
    await this.repo.update(id, { lastLogin: new Date() });
  }
}
