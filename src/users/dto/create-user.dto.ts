import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';
import { UserClassification } from '../entities/user.entity';

export class CreateUserDto {
  @ApiProperty({ example: 'Rahul Sharma' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'rahul@company.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Password123!' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ example: '+91 9876543210' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    enum: UserClassification,
    default: UserClassification.INTERNAL,
    description: 'User classification: internal or external',
  })
  @IsOptional()
  @IsString()
  userType?: string = UserClassification.INTERNAL;

  @ApiPropertyOptional({
    example: {
      sale: 'manager',
      inventory: 'user',
      purchase: 'manager',
      accounting: 'none',
    },
    description: 'Module access rights: sale, inventory, purchase, accounting (none, user, manager, management)',
  })
  @IsOptional()
  @IsObject()
  accessRights?: Record<string, string>;

  @ApiPropertyOptional({ description: 'Role ID (UUID)' })
  @IsOptional()
  @IsUUID()
  roleId?: string;

  @ApiPropertyOptional({ description: 'Company ID (UUID)' })
  @IsOptional()
  @IsUUID()
  companyId?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ default: false, description: 'Whether this user has Administration privileges' })
  @IsOptional()
  @IsBoolean()
  isAdmin?: boolean;
}
