import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Post()
  @Roles('admin', 'company_admin')
  create(@Body() dto: CreateUserDto, @CurrentUser() user: any) {
    return this.service.create(dto, user?.companyId);
  }

  @Get()
  @Roles('admin', 'company_admin', 'sales_manager', 'inventory_manager', 'purchase_manager', 'staff')
  findAll(
    @Query() query: PaginationQueryDto & { companyId?: string },
    @CurrentUser() user: any,
  ) {
    return this.service.findAll(query, user?.companyId);
  }

  @Get('me')
  me(@CurrentUser() user: any) {
    return this.service.findOne(user.userId);
  }

  @Get(':id')
  @Roles('admin', 'company_admin')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.findOne(id, user?.companyId);
  }

  @Patch(':id')
  @Roles('admin', 'company_admin')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: any,
  ) {
    return this.service.update(id, dto, user?.companyId);
  }

  @Patch(':id/change-password')
  changePassword(@Param('id') id: string, @Body() dto: ChangePasswordDto) {
    return this.service.changePassword(id, dto);
  }

  @Delete(':id')
  @Roles('admin', 'company_admin')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.remove(id, user?.companyId);
  }
}

