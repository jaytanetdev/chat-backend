import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CredentialService } from './credential.service';
import { CreateCredentialDto } from './dto/create-credential.dto';
import { UpdateCredentialDto } from './dto/update-credential.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../../entities';

@ApiTags('Credential')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('credentials')
export class CredentialController {
  constructor(private readonly credentialService: CredentialService) {}

  @Post()
  @ApiOperation({ summary: 'Create credential (api_key stored securely)' })
  @ApiResponse({ status: 201, description: 'Credential created' })
  create(
    @Body() dto: CreateCredentialDto,
    @CurrentUser('user_id') userId: string,
  ) {
    return this.credentialService.create(dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'List credentials (api_key not returned)' })
  @ApiQuery({ name: 'platformId', required: false })
  @ApiResponse({ status: 200, description: 'List of credentials' })
  findAll(@Query('platformId') platformId?: string) {
    if (platformId) return this.credentialService.findByPlatform(platformId);
    return this.credentialService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get credential by id (api_key not returned)' })
  @ApiResponse({ status: 200, description: 'Credential found' })
  findOne(@Param('id') id: string) {
    return this.credentialService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update credential' })
  @ApiResponse({ status: 200, description: 'Credential updated' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCredentialDto,
    @CurrentUser('user_id') userId: string,
  ) {
    return this.credentialService.update(id, dto, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete credential' })
  @ApiResponse({ status: 200, description: 'Credential deleted' })
  remove(@Param('id') id: string) {
    return this.credentialService.remove(id);
  }
}
