import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { CompanyType } from '../entities/partner.entity';

export class PartnerQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by customer flag' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isCustomer?: boolean;

  @ApiPropertyOptional({ description: 'Filter by vendor flag' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isVendor?: boolean;

  @ApiPropertyOptional({
    description: 'Filter kind (customer or vendor)',
    enum: ['customer', 'vendor'],
  })
  @IsOptional()
  @IsString()
  kind?: 'customer' | 'vendor';

  @ApiPropertyOptional({
    description: 'Filter by company type: company or individual',
    enum: CompanyType,
  })
  @IsOptional()
  @IsEnum(CompanyType)
  companyType?: CompanyType;

  @ApiPropertyOptional({
    description: 'Filter by parent company ID (UUID)',
  })
  @IsOptional()
  @IsUUID()
  parentId?: string;
}
