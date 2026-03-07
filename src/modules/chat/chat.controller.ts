import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { CreateChatDto } from './dto/create-chat.dto';
import { InboundWebhookDto } from './dto/inbound-webhook.dto';
import { ChatListResponseDto } from './dto/chat-list-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Chat, ChatDirection, User, UserRole } from '../../entities';

@ApiTags('Chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('chats')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @ApiOperation({ summary: 'Send message (sender = current admin)' })
  @ApiResponse({ status: 201, description: 'Message sent' })
  create(
    @Body() dto: CreateChatDto,
    @CurrentUser() user: User,
  ) {
    return this.chatService.create(
      dto,
      user.user_id,
      ChatDirection.OUT,
    );
  }

  @Post('webhook/inbound')
  @Public()
  @ApiOperation({ summary: 'Inbound webhook (LINE etc.): platform → customer → room → chat in one call' })
  @ApiResponse({ status: 201, description: 'Chat created/updated' })
  @ApiResponse({ status: 400, description: 'Invalid payload or platform not found' })
  processInbound(@Body() body: InboundWebhookDto) {
    return this.chatService.processInboundWebhook(body);
  }

  @Get('room/:roomId')
  @ApiOperation({ summary: 'List messages in room (infinite scroll)' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Paginated messages', type: ChatListResponseDto })
  async findByRoom(
    @Param('roomId') roomId: string,
    @Query('limit') limit?: number,
    @Query('cursor') cursor?: string,
  ): Promise<ChatListResponseDto<Chat>> {
    const limitNum = limit ? Math.min(100, Math.max(1, Number(limit))) : 20;
    return this.chatService.findByRoom(roomId, limitNum, cursor);
  }

  @Get('room/:roomId/detailed')
  @ApiOperation({ summary: 'List messages with sender names (for chat UI)' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  @ApiQuery({ name: 'direction', required: false, enum: ['older', 'newer'] })
  @ApiResponse({ status: 200, description: 'Paginated messages with sender_name' })
  async findByRoomDetailed(
    @Param('roomId') roomId: string,
    @Query('limit') limit?: number,
    @Query('cursor') cursor?: string,
    @Query('direction') direction?: 'older' | 'newer',
  ) {
    const limitNum = limit ? Math.min(100, Math.max(1, Number(limit))) : 20;
    return this.chatService.findByRoomWithSenderNames(roomId, limitNum, cursor, direction || 'older');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get message by id' })
  @ApiResponse({ status: 200, description: 'Message found' })
  findOne(@Param('id') id: string) {
    return this.chatService.findOne(id);
  }
}
