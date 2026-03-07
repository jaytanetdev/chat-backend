import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ShopService } from './shop.service';
import { CreateShopDto } from './dto/create-shop.dto';
import { UpdateShopDto } from './dto/update-shop.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from '../../entities';

@ApiTags('Shop')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('shops')
export class ShopController {
  constructor(private readonly shopService: ShopService) {}

  @Post()
  @ApiOperation({ summary: 'Create shop' })
  @ApiResponse({ status: 201, description: 'Shop created' })
  create(@Body() dto: CreateShopDto, @CurrentUser('user_id') userId: string) {
    return this.shopService.create(dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'List all shops' })
  @ApiResponse({ status: 200, description: 'List of shops' })
  findAll() {
    return this.shopService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get shop by id' })
  @ApiResponse({ status: 200, description: 'Shop found' })
  @ApiResponse({ status: 404, description: 'Shop not found' })
  findOne(@Param('id') id: string) {
    return this.shopService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update shop' })
  @ApiResponse({ status: 200, description: 'Shop updated' })
  @ApiResponse({ status: 404, description: 'Shop not found' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateShopDto,
    @CurrentUser('user_id') userId: string,
  ) {
    return this.shopService.update(id, dto, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete shop' })
  @ApiResponse({ status: 200, description: 'Shop deleted' })
  @ApiResponse({ status: 404, description: 'Shop not found' })
  remove(@Param('id') id: string) {
    return this.shopService.remove(id);
  }
}
