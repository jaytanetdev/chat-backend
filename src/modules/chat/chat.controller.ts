import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiConsumes, ApiBody } from '@nestjs/swagger';
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
import { LineMessagingService } from '../line/line-messaging.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@ApiTags('Chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('chats')
export class ChatController {
  private readonly logger = new Logger(ChatController.name);

  constructor(
    private readonly chatService: ChatService,
    private readonly chatEmitterService: ChatEmitterService,
    private readonly roomService: RoomService,
    private readonly lineMessagingService: LineMessagingService,
    private readonly cloudinaryService: CloudinaryService,
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

    await this.roomService.updateLastMessage(dto.room_id, chat.create_at, dto.message);
    this.chatEmitterService.emitRoomUpdated(dto.room_id, {
      last_message_at: chat.create_at.toISOString(),
      last_message_text: dto.message,
    });

    return chat;
  }

  @Post('send-media')
  @ApiOperation({ summary: 'Send media message (image/file) — Cloudinary or local fallback' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        room_id: { type: 'string' },
        message_type: { type: 'string', enum: ['IMAGE', 'VIDEO', 'AUDIO', 'FILE'] },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async sendMedia(
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: 50 * 1024 * 1024 })],
      }),
    )
    file: Express.Multer.File,
    @Body('room_id') roomId: string,
    @Body('message_type') messageType: string,
    @CurrentUser() user: User,
  ) {
    const isImage = (messageType?.toUpperCase() === 'IMAGE') || file.mimetype.startsWith('image/');
    const isVideo = file.mimetype.startsWith('video/');
    const effectiveType = isImage
      ? ChatMessageType.IMAGE
      : isVideo
        ? ChatMessageType.VIDEO
        : ChatMessageType.FILE;

    let fileUrl: string;
    const metadata: Record<string, unknown> = {
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
    };

    if (this.cloudinaryService.isConfigured()) {
      const resourceType = isImage ? 'image' as const : isVideo ? 'video' as const : 'raw' as const;
      const uploaded = await this.cloudinaryService.uploadBuffer(file.buffer, {
        folder: `chat/room_${roomId}/user_${user.user_id}`,
        resourceType,
      });
      fileUrl = uploaded.secure_url;
      metadata.cloudinaryPublicId = uploaded.public_id;
      if (uploaded.width) metadata.width = uploaded.width;
      if (uploaded.height) metadata.height = uploaded.height;
    } else {
      const fs = await import('fs/promises');
      const path = await import('path');
      const crypto = await import('crypto');
      const ext = path.extname(file.originalname) || '';
      const filename = `${crypto.randomUUID()}${ext}`;
      const uploadDir = path.join(process.cwd(), 'uploads', `room_${roomId}`, `user_${user.user_id}`);
      await fs.mkdir(uploadDir, { recursive: true });
      await fs.writeFile(path.join(uploadDir, filename), file.buffer);
      fileUrl = `/uploads/room_${roomId}/user_${user.user_id}/${filename}`;
    }

    metadata.url = fileUrl;
    metadata.previewUrl = fileUrl;

    const messageText = isImage ? '[รูปภาพ]' : isVideo ? '[วิดีโอ]' : file.originalname;

    const chat = await this.chatService.create(
      {
        room_id: roomId,
        message: messageText,
        message_type: effectiveType,
        metadata,
      },
      user.user_id,
      ChatDirection.OUT,
    );

    try {
      if (isImage && fileUrl.startsWith('http')) {
        await this.chatService.sendImageToPlatform(roomId, fileUrl);
      }
    } catch (error) {
      this.logger.warn(`Platform media send failed: ${error.message}`);
    }

    const payload = {
      ...chat,
      sender_name: user.username,
      sender_type: ChatSenderType.ADMIN,
    };
    this.chatEmitterService.emitNewMessage(roomId, payload);

    await this.roomService.updateLastMessage(roomId, chat.create_at, messageText);
    this.chatEmitterService.emitRoomUpdated(roomId, {
      last_message_at: chat.create_at.toISOString(),
      last_message_text: messageText,
    });

    return chat;
  }

  @Post('webhook/inbound')
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: 'Inbound webhook (LINE etc.): platform → customer → room → chat in one call' })
  @ApiResponse({ status: 200, description: 'Chat created/updated' })
  @ApiResponse({ status: 400, description: 'Invalid payload or platform not found' })
  processInbound(@Body() body: any) {
    if (!body?.destination || !body?.events) {
      this.logger.warn(`Inbound webhook called with invalid body: ${JSON.stringify(body ?? null).substring(0, 200)}`);
      return { status: 'ok' };
    }
    this.chatService.processInboundWebhook(body).catch((err) =>
      this.logger.error(`Error in inbound webhook: ${err.message}`, err.stack),
    );
    return { status: 'ok' };
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

  @Public()
  @Get('content/:messageId')
  @ApiOperation({ summary: 'Proxy LINE message content (image/video/audio)' })
  @ApiQuery({ name: 'platformId', required: true, type: String })
  @ApiResponse({ status: 200, description: 'Binary content' })
  @ApiResponse({ status: 404, description: 'Content not found' })
  async getContent(
    @Param('messageId') messageId: string,
    @Query('platformId') platformId: string,
    @Res() res: Response,
  ) {
    try {
      const { data, contentType } = await this.lineMessagingService.getMessageContent(
        platformId,
        messageId,
      );
      res.set({
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      });
      res.send(data);
    } catch (error) {
      this.logger.error(`Failed to get content ${messageId}: ${error.message}`);
      res.status(HttpStatus.NOT_FOUND).json({ message: 'Content not found' });
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get message by id' })
  @ApiResponse({ status: 200, description: 'Message found' })
  findOne(@Param('id') id: string) {
    return this.chatService.findOne(id);
  }
}
