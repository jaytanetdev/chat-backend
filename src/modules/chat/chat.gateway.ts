import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, ChatReadReceipt, ChatDirection, ChatSenderType } from '../../entities';
import { ChatService } from './chat.service';
import { ChatEmitterService } from './chat-emitter.service';
import { RoomService } from '../room/room.service';

interface AuthenticatedSocket extends Socket {
  data: { user: User };
}

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(ChatReadReceipt)
    private readonly readReceiptRepository: Repository<ChatReadReceipt>,
    private readonly chatService: ChatService,
    private readonly chatEmitterService: ChatEmitterService,
    private readonly roomService: RoomService,
  ) {}

  afterInit(server: Server) {
    this.chatEmitterService.setServer(server);
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token =
        client.handshake.auth?.token ??
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn(`Client ${client.id} connected without token`);
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      const user = await this.userRepository.findOne({
        where: { user_id: payload.sub },
      });

      if (!user) {
        client.disconnect();
        return;
      }

      client.data.user = user;
      this.logger.log(`Client ${client.id} connected as ${user.username}`);
    } catch {
      this.logger.warn(`Client ${client.id} auth failed`);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    const username = client.data?.user?.username ?? 'unknown';
    this.logger.log(`Client ${client.id} disconnected (${username})`);
  }

  @SubscribeMessage('join_room')
  async handleJoinRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { room_id: string },
  ) {
    const roomKey = `room:${data.room_id}`;
    await client.join(roomKey);

    await this.roomService.resetUnread(data.room_id);

    this.server.to(roomKey).emit('room_updated', {
      room_id: data.room_id,
      unread_count: 0,
    });

    this.logger.log(`${client.data.user.username} joined ${roomKey}`);
    return { event: 'joined', room_id: data.room_id };
  }

  @SubscribeMessage('leave_room')
  async handleLeaveRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { room_id: string },
  ) {
    const roomKey = `room:${data.room_id}`;
    await client.leave(roomKey);
    this.logger.log(`${client.data.user.username} left ${roomKey}`);
    return { event: 'left', room_id: data.room_id };
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: {
      room_id: string;
      message: string;
      message_type?: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    const user = client.data.user;

    // Create message in database
    const chat = await this.chatService.create(
      {
        room_id: data.room_id,
        message: data.message,
        message_type: data.message_type as never,
        metadata: data.metadata,
      },
      user.user_id,
      ChatDirection.OUT,
    );

    // Send message to external platform (LINE, Facebook, Instagram)
    try {
      await this.chatService.sendMessageToPlatform(
        data.room_id,
        data.message,
        data.message_type as never,
      );
    } catch (error) {
      this.logger.error(`Failed to send message to platform: ${error.message}`);
      // Continue - message is saved in DB, but platform send failed
    }

    const payload = {
      ...chat,
      sender_name: user.username,
      sender_type: ChatSenderType.ADMIN,
    };

    this.server.to(`room:${data.room_id}`).emit('new_message', payload);

    return { event: 'message_sent', chat_id: chat.chat_id };
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { room_id: string; is_typing: boolean },
  ) {
    const user = client.data.user;
    client.to(`room:${data.room_id}`).emit('typing', {
      room_id: data.room_id,
      user_id: user.user_id,
      username: user.username,
      is_typing: data.is_typing,
    });
  }

  @SubscribeMessage('mark_read')
  async handleMarkRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { room_id: string; chat_ids: string[] },
  ) {
    const user = client.data.user;

    const receipts: ChatReadReceipt[] = [];
    const processedChatIds: string[] = [];

    for (const chatId of data.chat_ids) {
      try {
        // Check if receipt already exists first (optimization)
        const existing = await this.readReceiptRepository.findOne({
          where: { chat_id: chatId, user_id: user.user_id },
        });

        if (existing) {
          // Already exists, count as processed
          receipts.push(existing);
          processedChatIds.push(chatId);
          continue;
        }

        // Use insert with ON CONFLICT DO NOTHING to handle race conditions
        // This prevents duplicate key errors when multiple requests happen simultaneously
        await this.readReceiptRepository
          .createQueryBuilder()
          .insert()
          .into(ChatReadReceipt)
          .values({
            chat_id: chatId,
            user_id: user.user_id,
          })
          .orIgnore() // ON CONFLICT DO NOTHING - handles duplicate key gracefully
          .execute();

        // Get the receipt (either newly created or existing from race condition)
        const receipt = await this.readReceiptRepository.findOne({
          where: { chat_id: chatId, user_id: user.user_id },
        });

        if (receipt) {
          receipts.push(receipt);
          processedChatIds.push(chatId);
        }
      } catch (error: any) {
        // Fallback error handling (shouldn't happen with orIgnore, but just in case)
        if (error.code === '23505') {
          // Duplicate key error - receipt was created by another request
          this.logger.debug(`Read receipt already exists for chat ${chatId} and user ${user.user_id} (race condition)`);
          const existing = await this.readReceiptRepository.findOne({
            where: { chat_id: chatId, user_id: user.user_id },
          });
          if (existing) {
            receipts.push(existing);
            processedChatIds.push(chatId);
          }
        } else {
          this.logger.error(`Failed to mark chat ${chatId} as read: ${error.message}`, error.stack);
        }
      }
    }

    if (processedChatIds.length > 0) {
      this.server.to(`room:${data.room_id}`).emit('messages_read', {
        room_id: data.room_id,
        user_id: user.user_id,
        username: user.username,
        chat_ids: processedChatIds,
      });
    }

    return { event: 'marked_read', count: receipts.length };
  }
}
