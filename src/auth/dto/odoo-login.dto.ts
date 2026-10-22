import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class OdooLoginDto {
  @ApiProperty({ example: 'http://192.168.1.6:8070', required: false, description: 'Odoo Server URL' })
  @IsOptional()
  @IsString()
  serverUrl?: string;

  @ApiProperty({ example: 'current_db', required: false, description: 'Odoo Database name' })
  @IsOptional()
  @IsString()
  database?: string;

  @ApiProperty({ example: 'admin@admin.com', description: 'Odoo Username / Email' })
  @IsNotEmpty()
  @IsString()
  username: string;

  @ApiProperty({ example: 'a', description: 'Odoo Password' })
  @IsNotEmpty()
  @IsString()
  password: string;
}

