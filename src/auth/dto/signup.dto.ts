import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export enum RegistrationType {
  COMPANY = 'company',
  INDIVIDUAL = 'individual',
}

export enum CompanyLegalStructure {
  PVT_LTD = 'pvt_ltd',
  LLC = 'llc',
  PROPRIETORSHIP = 'proprietorship',
  PARTNERSHIP = 'partnership',
  OTHER = 'other',
}

export class SignupDto {
  @ApiProperty({
    enum: RegistrationType,
    default: RegistrationType.COMPANY,
    description: 'Registration mode: as Company or Individual',
  })
  @IsOptional()
  @IsEnum(RegistrationType)
  registrationType?: RegistrationType = RegistrationType.COMPANY;

  // --- Common User Account Credentials ---
  @ApiProperty({ example: 'Rahul Sharma', description: 'Full name of the user' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: 'rahul@apex.com', description: 'Email address for login' })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Secret123!', minLength: 6, description: 'Password' })
  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ example: '+91 9876543210', description: 'Personal or Work Phone' })
  @IsOptional()
  @IsString()
  phone?: string;

  // --- Company Registration Fields (Used when registrationType === 'company') ---
  @ApiPropertyOptional({ example: 'Apex Technologies Pvt Ltd' })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional({
    enum: CompanyLegalStructure,
    default: CompanyLegalStructure.PVT_LTD,
    description: 'Pvt Ltd, LLC, Proprietorship, Partnership, etc.',
  })
  @IsOptional()
  @IsString()
  companyType?: string;

  @ApiPropertyOptional({ example: 'APEX' })
  @IsOptional()
  @IsString()
  companyCode?: string;

  @ApiPropertyOptional({ example: 'contact@apex.com' })
  @IsOptional()
  @IsString()
  companyEmail?: string;

  @ApiPropertyOptional({ example: '+91 11 23456789' })
  @IsOptional()
  @IsString()
  companyPhone?: string;

  @ApiPropertyOptional({ example: '07AAAAA0000A1Z5', description: 'GSTIN / Tax ID' })
  @IsOptional()
  @IsString()
  gstin?: string;

  // --- Address Fields (For Company if company, or Individual if individual) ---
  @ApiPropertyOptional({ example: '123 Business Avenue, Tech Zone' })
  @IsOptional()
  @IsString()
  street?: string;

  @ApiPropertyOptional({ example: 'Mumbai' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'Maharashtra' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ example: 'India', default: 'India' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ example: '400001' })
  @IsOptional()
  @IsString()
  zip?: string;

  // --- Individual Specific Fields (Used when registrationType === 'individual') ---
  @ApiPropertyOptional({
    example: 'e60fc54b-94cb-4aa0-b45d-09bb73df6855',
    description: 'ID of the company this individual person belongs to',
  })
  @IsOptional()
  @IsString()
  companyId?: string;
}
