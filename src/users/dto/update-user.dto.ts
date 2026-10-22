import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Rahul Sharma' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'rahul@company.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'NewSecret123!' })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @ApiPropertyOptional({ example: '+91 9876543210' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'internal', description: 'internal or external' })
  @IsOptional()
  @IsString()
  userType?: string;

  @ApiPropertyOptional({
    example: {
      sale: 'manager',
      inventory: 'user',
      purchase: 'manager',
      accounting: 'user',
    },
    description: 'Module access rights: sale, inventory, purchase, accounting (none, user, manager, management)',
  })
  @IsOptional()
  @IsObject()
  accessRights?: Record<string, string>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  roleId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ description: 'Whether this user has Administration privileges' })
  @IsOptional()
  @IsBoolean()
  isAdmin?: boolean;
}
