import {
  Controller,
  Get,
  Post,
  Body,
  Delete,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UserPlatformService } from './user-platform.service';
import { AssignUserPlatformDto } from './dto/assign-user-platform.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../entities';

@ApiTags('User Platform')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('user-platforms')
export class UserPlatformController {
  constructor(private readonly userPlatformService: UserPlatformService) {}

  @Post()
  @ApiOperation({ summary: 'Assign user to platform (idempotent)' })
  @ApiResponse({ status: 201, description: 'User assigned to platform' })
  assign(@Body() dto: AssignUserPlatformDto) {
    return this.userPlatformService.assign(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all or filter by userId / platformId (for n8n where)' })
  @ApiQuery({ name: 'userId', required: false, description: 'Filter by user' })
  @ApiQuery({ name: 'platformId', required: false, description: 'Filter by platform' })
  @ApiResponse({ status: 200, description: 'List of user-platform assignments' })
  findAll(@Query('userId') userId?: string, @Query('platformId') platformId?: string) {
    if (userId) return this.userPlatformService.findByUser(userId);
    if (platformId) return this.userPlatformService.findByPlatform(platformId);
    return this.userPlatformService.findAll();
  }

  @Delete(':userId/:platformId')
  @ApiOperation({ summary: 'Unassign user from platform' })
  @ApiResponse({ status: 200, description: 'Unassigned' })
  @ApiResponse({ status: 404, description: 'Assignment not found' })
  remove(@Param('userId') userId: string, @Param('platformId') platformId: string) {
    return this.userPlatformService.remove(userId, platformId);
  }
}
