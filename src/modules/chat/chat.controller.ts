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
import { Chat, ChatDirection, ChatMessageType, ChatSenderType, User, UserRole } from '../../entities';
import { ChatEmitterService } from './chat-emitter.service';
import { RoomService } from '../room/room.service';

@ApiTags('Chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('chats')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly chatEmitterService: ChatEmitterService,
    private readonly roomService: RoomService,
  ) {}

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

  @Post('send')
  @ApiOperation({ summary: 'Send message to room and platform (LINE, Facebook, etc.)' })
  @ApiResponse({ status: 201, description: 'Message sent to platform' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  async send(
    @Body() dto: CreateChatDto,
    @CurrentUser() user: User,
  ) {
    // Create message in database
    const chat = await this.chatService.create(
      dto,
      user.user_id,
      ChatDirection.OUT,
    );

    // Send message to external platform (LINE, Facebook, Instagram)
    try {
      await this.chatService.sendMessageToPlatform(
        dto.room_id,
        dto.message,
        dto.message_type || ChatMessageType.TEXT,
      );
    } catch (error) {
      // Log error but still return the created chat
      // The message is saved in DB even if platform send fails
    }

    // Emit new message via WebSocket for real-time updates
    const payload = {
      ...chat,
      sender_name: user.username,
      sender_type: ChatSenderType.ADMIN,
    };
    this.chatEmitterService.emitNewMessage(dto.room_id, payload);

    // Update room's last message timestamp and emit update
    await this.roomService.updateLastMessage(dto.room_id, chat.create_at);
    this.chatEmitterService.emitRoomUpdated(dto.room_id, {
      last_message_at: chat.create_at.toISOString(),
    });

    return chat;
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
