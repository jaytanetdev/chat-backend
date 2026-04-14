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
import { RoomService } from './room.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { AddRoomMemberDto } from './dto/add-room-member.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../entities';

@ApiTags('Room')
@ApiBearerAuth()
// @UseGuards(JwtAuthGuard, RolesGuard)
// @Roles(UserRole.ADMIN)
@Controller('rooms')
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  @Post()
  @ApiOperation({ summary: 'Create room' })
  @ApiResponse({ status: 201, description: 'Room created' })
  create(@Body() dto: CreateRoomDto) {
    return this.roomService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List rooms with pagination, search, and platform filter' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'platformType', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'platformId', required: false })
  @ApiResponse({ status: 200, description: 'Paginated list of rooms' })
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('platformType') platformType?: string,
    @Query('search') search?: string,
    @Query('platformId') platformId?: string,
  ) {
    if (platformId) return this.roomService.findByPlatform(platformId);
    return this.roomService.findPaginated({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      platformType,
      search,
    });
  }

  @Get('unread-summary')
  @ApiOperation({ summary: 'Get unread message count per platform' })
  @ApiResponse({ status: 200, description: 'Unread summary' })
  getUnreadSummary() {
    return this.roomService.getUnreadSummary();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get room by id with members' })
  @ApiResponse({ status: 200, description: 'Room found' })
  findOne(@Param('id') id: string) {
    return this.roomService.findOne(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete room' })
  @ApiResponse({ status: 200, description: 'Room deleted' })
  remove(@Param('id') id: string) {
    return this.roomService.remove(id);
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Add member to room' })
  @ApiResponse({ status: 201, description: 'Member added' })
  addMember(@Param('id') id: string, @Body() dto: AddRoomMemberDto) {
    return this.roomService.addMember(id, dto.user_id, dto.role);
  }

  @Delete(':id/members/:userId')
  @ApiOperation({ summary: 'Remove member from room' })
  @ApiResponse({ status: 200, description: 'Member removed' })
  removeMember(@Param('id') id: string, @Param('userId') userId: string) {
    return this.roomService.removeMember(id, userId);
  }
}
