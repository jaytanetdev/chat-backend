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
import { PlatformService } from './platform.service';
import { CreatePlatformDto } from './dto/create-platform.dto';
import { UpdatePlatformDto } from './dto/update-platform.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from '../../entities';

@ApiTags('Platform')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('platforms')
export class PlatformController {
  constructor(private readonly platformService: PlatformService) {}

  @Post()
  @ApiOperation({ summary: 'Create platform' })
  @ApiResponse({ status: 201, description: 'Platform created' })
  create(
    @Body() dto: CreatePlatformDto,
    @CurrentUser('user_id') userId: string,
  ) {
    return this.platformService.create(dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'List all platforms or by shop' })
  @ApiQuery({ name: 'shopId', required: false })
  @ApiResponse({ status: 200, description: 'List of platforms' })
  findAll(@Query('shopId') shopId?: string) {
    if (shopId) return this.platformService.findByShop(shopId);
    return this.platformService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get platform by id' })
  @ApiResponse({ status: 200, description: 'Platform found' })
  @ApiResponse({ status: 404, description: 'Platform not found' })
  findOne(@Param('id') id: string) {
    return this.platformService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update platform' })
  @ApiResponse({ status: 200, description: 'Platform updated' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePlatformDto,
    @CurrentUser('user_id') userId: string,
  ) {
    return this.platformService.update(id, dto, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete platform' })
  @ApiResponse({ status: 200, description: 'Platform deleted' })
  remove(@Param('id') id: string) {
    return this.platformService.remove(id);
  }
}
