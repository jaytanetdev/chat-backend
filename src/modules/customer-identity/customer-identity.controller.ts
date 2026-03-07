import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CustomerIdentityService } from './customer-identity.service';
import { CreateCustomerIdentityDto } from './dto/create-customer-identity.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../entities';

@ApiTags('Customer Identity')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('customer-identities')
export class CustomerIdentityController {
  constructor(private readonly customerIdentityService: CustomerIdentityService) {}

  @Post()
  @ApiOperation({ summary: 'Create or get existing customer identity (platform + external_user_id)' })
  @ApiResponse({ status: 201, description: 'Customer identity created or existing returned' })
  create(@Body() dto: CreateCustomerIdentityDto) {
    return this.customerIdentityService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all customer identities or by platform' })
  @ApiQuery({ name: 'platformId', required: false })
  @ApiResponse({ status: 200, description: 'List of customer identities' })
  findAll(@Query('platformId') platformId?: string) {
    if (platformId) return this.customerIdentityService.findByPlatform(platformId);
    return this.customerIdentityService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get customer identity by id' })
  @ApiResponse({ status: 200, description: 'Customer identity found' })
  @ApiResponse({ status: 404, description: 'Customer identity not found' })
  findOne(@Param('id') id: string) {
    return this.customerIdentityService.findOne(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete customer identity' })
  @ApiResponse({ status: 200, description: 'Customer identity deleted' })
  remove(@Param('id') id: string) {
    return this.customerIdentityService.remove(id);
  }
}
