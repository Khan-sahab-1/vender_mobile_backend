import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { CompaniesService } from '../companies/companies.service';
import { LoginDto } from './dto/login.dto';
import { RegistrationType, SignupDto } from './dto/signup.dto';
import { User, UserType } from '../users/entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import { Company } from '../companies/entities/company.entity';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly companiesService: CompaniesService,
    private readonly jwtService: JwtService,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
  ) {}

  /**
   * Multi-Tenant Registration Flow:
   * - If Company:
   *   1. Creates Company with legal structure (Pvt, LLC, Prop, etc.) & address
   *   2. Bootstraps default warehouse, locations, product categories, UoMs, journals
   *   3. Creates Admin user tied to this new company
   * - If Individual:
   *   1. Verifies existing company selection (which company this person comes from)
   *   2. Creates User as individual staff member tied to selected company
   *   3. Stores personal/work address details
   */
  async signup(dto: SignupDto) {
    const email = dto.email.trim().toLowerCase();

    const isIndividual = dto.registrationType === RegistrationType.INDIVIDUAL;

    let targetCompany: Company;
    let assignedRole: Role;
    let userType: string;

    if (isIndividual) {
      // --- INDIVIDUAL REGISTRATION ---
      if (!dto.companyId) {
        throw new BadRequestException('Please select the company you belong to.');
      }

      const existingInCompany = await this.userRepo.findOne({
        where: { email, companyId: dto.companyId },
      });
      if (existingInCompany) {
        throw new ConflictException('An account with this email already exists for this company.');
      }

      const foundCompany = await this.companyRepo.findOne({
        where: { id: dto.companyId },
      });
      if (!foundCompany) {
        throw new NotFoundException('The selected company was not found.');
      }
      targetCompany = foundCompany;
      userType = UserType.INDIVIDUAL;

      // Assign staff/member role
      let staffRole = await this.roleRepo.findOne({
        where: [{ name: 'staff' }, { name: 'sales_manager' }],
      });
      if (!staffRole) {
        staffRole = await this.roleRepo.save(
          this.roleRepo.create({
            name: 'staff',
            description: 'Individual company member',
            permissions: ['read', 'write'],
          }),
        );
      }
      assignedRole = staffRole;
    } else {
      // --- COMPANY REGISTRATION ---
      if (!dto.companyName || !dto.companyName.trim()) {
        throw new BadRequestException('Company name is required for company registration.');
      }

      const cleanCompanyName = dto.companyName.trim();
      const companyCode = (
        dto.companyCode ||
        cleanCompanyName.substring(0, 4).toUpperCase().replace(/[^A-Z0-9]/g, '') ||
        'COMP'
      ).substring(0, 10);

      const company = this.companyRepo.create({
        name: cleanCompanyName,
        companyType: dto.companyType || 'pvt_ltd',
        code: companyCode,
        email: dto.companyEmail || email,
        phone: dto.companyPhone || dto.phone,
        street: dto.street,
        city: dto.city,
        state: dto.state,
        country: dto.country || 'India',
        zip: dto.zip,
        gstin: dto.gstin,
        currency: 'INR',
      });
      targetCompany = await this.companyRepo.save(company);

      // Bootstrap default master data (Warehouse, Locations, Categories, UoMs, Journals)
      try {
        await this.companiesService.bootstrapCompanyMasterData(targetCompany);
      } catch (err: any) {
        this.logger.warn(`Master data bootstrap warning: ${err.message}`);
      }

      // Assign admin role
      let adminRole = await this.roleRepo.findOne({ where: { name: 'admin' } });
      if (!adminRole) {
        adminRole = await this.roleRepo.save(
          this.roleRepo.create({
            name: 'admin',
            description: 'Administrator with full system access',
            permissions: ['*'],
          }),
        );
      }
      assignedRole = adminRole;
      userType = UserType.COMPANY_ADMIN;
    }

    // Create user
    const isAdmin = !isIndividual;
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = this.userRepo.create({
      name: dto.name.trim(),
      email,
      password: hashedPassword,
      phone: dto.phone,
      roleId: assignedRole.id,
      companyId: targetCompany.id,
      userType,
      isAdmin,
      accessRights: {
        sale: 'management',
        inventory: 'management',
        purchase: 'management',
        accounting: 'management',
      },
      street: dto.street,
      city: dto.city,
      state: dto.state,
      country: dto.country || 'India',
      zip: dto.zip,
    });
    const savedUser = await this.userRepo.save(user);
    savedUser.role = assignedRole;
    savedUser.company = targetCompany;

    await this.usersService.touchLastLogin(savedUser.id);

    const accessRights = savedUser.accessRights || {
      sale: 'management',
      inventory: 'management',
      purchase: 'management',
      accounting: 'management',
    };

    // Sign JWT
    const payload = {
      sub: savedUser.id,
      email: savedUser.email,
      role: assignedRole.name,
      partnerId: null,
      companyId: targetCompany.id,
      company: targetCompany.name,
      userType,
      isAdmin: savedUser.isAdmin,
      accessRights,
      isVendor: false,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: savedUser.id,
        name: savedUser.name,
        email: savedUser.email,
        role: assignedRole.name,
        partnerId: null,
        companyId: targetCompany.id,
        company: targetCompany.name,
        userType,
        isAdmin: savedUser.isAdmin,
        accessRights,
        isVendor: false,
      },
    };
  }

  /**
   * Direct Login Flow (Email + Password)
   */
  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();
    const users = await this.userRepo.find({
      where: { email, active: true },
      relations: ['role', 'company', 'partner'],
    });

    if (!users || users.length === 0) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    let matchedUser: User | null = null;
    for (const u of users) {
      const passwordMatches = await bcrypt.compare(dto.password, u.password);
      if (passwordMatches) {
        matchedUser = u;
        break;
      }
    }

    if (!matchedUser) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const user = matchedUser;
    await this.usersService.touchLastLogin(user.id);

    const isVendor = !!user.partnerId || user.role?.name?.toLowerCase() === 'vendor';

    let effectiveCompanyId = user.companyId;
    let effectiveCompanyName = user.company?.name;
    if (!effectiveCompanyId) {
      const defaultComp = await this.companyRepo.findOne({
        where: {},
        order: { createdAt: 'DESC' },
      });
      if (defaultComp) {
        effectiveCompanyId = defaultComp.id;
        effectiveCompanyName = defaultComp.name;
        await this.userRepo.update(user.id, { companyId: defaultComp.id });
      }
    }
    const companyName = effectiveCompanyName || 'Main Company';

    const accessRights = user.accessRights || (
      user.role?.name === 'admin' || user.userType === 'company_admin'
        ? { sale: 'management', inventory: 'management', purchase: 'management', accounting: 'management' }
        : { sale: 'user', inventory: 'user', purchase: 'user', accounting: 'none' }
    );

    const isAdmin = Boolean(
      user.isAdmin || user.role?.name === 'admin' || user.userType === 'company_admin',
    );

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role?.name ?? null,
      partnerId: user.partnerId ?? null,
      companyId: effectiveCompanyId ?? null,
      company: companyName,
      userType: user.userType,
      isAdmin,
      accessRights,
      isVendor,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role?.name ?? null,
        partnerId: user.partnerId ?? null,
        companyId: effectiveCompanyId ?? null,
        company: companyName,
        userType: user.userType,
        isAdmin,
        accessRights,
        isVendor,
        partner: user.partner ?? null,
      },
    };
  }
}
