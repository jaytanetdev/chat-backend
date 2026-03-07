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
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../../entities';

@ApiTags('User')
@ApiBearerAuth()
// @UseGuards(JwtAuthGuard, RolesGuard)
// @Roles(UserRole.ADMIN)
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @ApiOperation({ summary: 'Create user (ADMIN or USER)' })
  @ApiResponse({ status: 201, description: 'User created' })
  create(@Body() dto: CreateUserDto, @CurrentUser('user_id') userId: string) {
    return this.userService.create(dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'List all users' })
  @ApiResponse({ status: 200, description: 'List of users' })
  findAll() {
    return this.userService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by id' })
  @ApiResponse({ status: 200, description: 'User found' })
  @ApiResponse({ status: 404, description: 'User not found' })
  findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user' })
  @ApiResponse({ status: 200, description: 'User updated' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser('user_id') userId: string,
  ) {
    return this.userService.update(id, dto, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete user' })
  @ApiResponse({ status: 200, description: 'User deleted' })
  remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset user password by user_id or username' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    if (!dto.user_id && !dto.username) {
      return { success: false, message: 'Either user_id or username is required' };
    }

    if (dto.user_id) {
      const user = await this.userService.resetPasswordById(dto.user_id, dto.password);
      return { success: true, message: 'Password reset successfully', user_id: user.user_id };
    }

    const user = await this.userService.resetPasswordByUsername(dto.username!, dto.password);
    return { success: true, message: 'Password reset successfully', user_id: user.user_id };
  }
}
