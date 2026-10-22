import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateIf,
} from 'class-validator';
import {
  CompanyStructure,
  CompanyType,
} from '../entities/partner.entity';

export class CreatePartnerDto {
  @ApiProperty({ example: 'Acme Corporation' })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    enum: CompanyType,
    default: CompanyType.COMPANY,
    description: 'Individual or Company',
  })
  @IsOptional()
  @IsEnum(CompanyType)
  companyType?: CompanyType;

  @ApiPropertyOptional({
    enum: CompanyStructure,
    example: CompanyStructure.PVT_LTD,
    description:
      'Structure: pvt_ltd, public_ltd, llc, proprietorship, partnership, other',
  })
  @IsOptional()
  @IsEnum(CompanyStructure)
  companyStructure?: CompanyStructure;

  @ApiPropertyOptional({
    description: 'Parent Company ID if this partner is an individual contact (UUID)',
  })
  @IsOptional()
  @ValidateIf((o) => !!o.parentId)
  @IsUUID()
  parentId?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isCompany?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isCustomer?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isVendor?: boolean;

  // Contact Information
  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mobile?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  website?: string;

  // Address
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  street?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  street2?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  zip?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  country?: string;

  // Tax & Compliance
  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  hasGstin?: boolean;

  @ApiPropertyOptional({
    example: '27AAAAA0000A1Z5',
    description: 'GSTIN (GST Identification Number)',
  })
  @IsOptional()
  @IsString()
  gstin?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  hasPan?: boolean;

  @ApiPropertyOptional({
    example: 'ABCDE1234F',
    description: 'PAN (Permanent Account Number)',
  })
  @IsOptional()
  @IsString()
  pan?: string;

  @ApiPropertyOptional({ description: 'Tax / VAT identification number' })
  @IsOptional()
  @IsString()
  taxId?: string;

  // Warehouse & Locations
  @ApiPropertyOptional({ description: 'Default Warehouse ID (UUID)' })
  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @ApiPropertyOptional({
    description: 'Customer Location ID (Drop-off stock location UUID)',
  })
  @IsOptional()
  @IsUUID()
  customerLocationId?: string;

  @ApiPropertyOptional({
    description: 'Vendor Location ID (Source stock location UUID)',
  })
  @IsOptional()
  @IsUUID()
  vendorLocationId?: string;

  // Invoicing & Accounting Properties
  @ApiPropertyOptional({
    description: 'Account Receivable ID from Chart of Accounts (UUID)',
  })
  @IsOptional()
  @IsUUID()
  accountReceivableId?: string;

  @ApiPropertyOptional({
    description: 'Account Payable ID from Chart of Accounts (UUID)',
  })
  @IsOptional()
  @IsUUID()
  accountPayableId?: string;

  // Commercial / Sales Terms
  @ApiPropertyOptional({ description: 'Payment Term ID (UUID)' })
  @IsOptional()
  @IsUUID()
  paymentTermId?: string;

  @ApiPropertyOptional({ description: 'Pricelist ID (UUID)' })
  @IsOptional()
  @IsUUID()
  pricelistId?: string;

  @ApiPropertyOptional({ default: 'INR' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  creditLimit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
