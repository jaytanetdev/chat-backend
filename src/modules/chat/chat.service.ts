import { Injectable, HttpStatus, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Chat, ChatDirection, ChatSenderType, ChatMessageType, RoomStatus } from '../../entities';
import { AppException, ErrorCode } from '../../common/errors';
import { CreateChatDto } from './dto/create-chat.dto';
import { PlatformService } from '../platform/platform.service';
import { RoomService } from '../room/room.service';
import { CustomerIdentityService } from '../customer-identity/customer-identity.service';
import { UserPlatformService } from '../user-platform/user-platform.service';
import { ChatEmitterService } from './chat-emitter.service';
import { LineMessagingService } from '../line/line-messaging.service';
import { FacebookMessagingService } from '../facebook/facebook-messaging.service';
import { InstagramMessagingService } from '../instagram/instagram-messaging.service';
import { PlatformType } from '../../entities/platform.entity';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectRepository(Chat)
    private readonly chatRepository: Repository<Chat>,
    private readonly platformService: PlatformService,
    private readonly roomService: RoomService,
    private readonly customerIdentityService: CustomerIdentityService,
    private readonly userPlatformService: UserPlatformService,
    private readonly chatEmitterService: ChatEmitterService,
    private readonly lineMessagingService: LineMessagingService,
    private readonly facebookMessagingService: FacebookMessagingService,
    private readonly instagramMessagingService: InstagramMessagingService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async create(
    dto: CreateChatDto,
    senderUserId: string | null,
    direction: ChatDirection = ChatDirection.OUT,
    externalMessageId?: string | null,
  ): Promise<Chat> {
    const chat = this.chatRepository.create({
      room_id: dto.room_id,
      sender_type: senderUserId ? ChatSenderType.ADMIN : (dto.sender_type ?? ChatSenderType.CUSTOMER),
      sender_id: senderUserId ?? dto.sender_id ?? null,
      direction: dto.direction ?? direction,
      external_message_id: dto.external_message_id ?? externalMessageId ?? null,
      message: dto.message,
      message_type: dto.message_type ?? ChatMessageType.TEXT,
      metadata: dto.metadata ?? null,
      is_read: dto.is_read ?? false,
    });
    return this.chatRepository.save(chat);
  }

  /**
   * Single API that replicates n8n inbound webhook flow:
   * 1. Find platform by destination (external_account_id)
   * 2. Find or create customer_identity (platform + external_user_id)
   * 3. Find or create room (platform + customer_identity)
   * 4. Add room members (users linked to this platform via user_platforms)
   * 5. Upsert chat (match on room_id + external_message_id)
   */
  async processInboundWebhook(body: Record<string, any>): Promise<{
    platform_id: string;
    customer_identity_id: string;
    room_id: string;
    chat: Chat;
  }> {
    const destination = body.destination;
    const event = body.events?.[0];
    if (!event?.source?.userId || !event?.message) {
      throw new AppException(
        ErrorCode.CHAT_INVALID_WEBHOOK,
        'Invalid webhook: events[0].source.userId and events[0].message required',
        HttpStatus.BAD_REQUEST,
      );
    }
    const externalUserId = event.source.userId;
    const msg = typeof event.message === 'object' ? event.message as Record<string, unknown> : null;
    const externalMessageId = msg?.id as string | undefined;
    const rawType = ((msg?.type as string) ?? 'text').toUpperCase();
    const messageType = Object.values(ChatMessageType).includes(rawType as ChatMessageType)
      ? (rawType as ChatMessageType)
      : ChatMessageType.TEXT;

    const isMediaType = [ChatMessageType.IMAGE, ChatMessageType.VIDEO, ChatMessageType.AUDIO, ChatMessageType.FILE, ChatMessageType.STICKER].includes(messageType);
    let messageText: string;
    if (msg?.text) {
      messageText = msg.text as string;
    } else if (isMediaType) {
      const labelMap: Record<string, string> = {
        IMAGE: '[รูปภาพ]',
        VIDEO: '[วิดีโอ]',
        AUDIO: '[เสียง]',
        FILE: (msg?.fileName as string) || '[ไฟล์]',
        STICKER: '[สติกเกอร์]',
      };
      messageText = labelMap[messageType] ?? '';
    } else {
      messageText = typeof event.message === 'string' ? event.message : '';
    }

    const platform = await this.platformService.findOneByExternalAccountId(destination);
    if (!platform) {
      throw new AppException(
        ErrorCode.CHAT_PLATFORM_NOT_FOUND,
        'Platform not found for destination',
        HttpStatus.BAD_REQUEST,
      );
    }

    const displayName = typeof event.source === 'object' && 'displayName' in event.source
      ? (event.source as { displayName?: string }).displayName
      : undefined;

    let customerIdentity = await this.customerIdentityService.findOrCreate(
      platform.platforms_id,
      externalUserId,
      displayName,
    );

    if (!customerIdentity.avatar_url || !customerIdentity.display_name) {
      try {
        customerIdentity = await this.fetchAndUpdateCustomerProfile(
          platform,
          customerIdentity,
          externalUserId,
        );
        this.logger.debug(`Customer profile updated: ${customerIdentity.display_name} / ${customerIdentity.avatar_url ? 'has avatar' : 'no avatar'}`);
      } catch (error) {
        this.logger.warn(`Failed to fetch customer profile for ${externalUserId}: ${error.message}`);
      }
    }

    let room = await this.roomService.findOneByPlatformAndCustomer(
      platform.platforms_id,
      customerIdentity.customer_identity_id,
    );
    if (!room) {
      room = await this.roomService.create({
        platforms_id: platform.platforms_id,
        customer_identity_id: customerIdentity.customer_identity_id,
        status: RoomStatus.ACTIVE,
      });
    }

    const userPlatforms = await this.userPlatformService.findByPlatform(platform.platforms_id);
    for (const up of userPlatforms) {
      await this.roomService.addMemberIfNotExists(room.room_id, up.user_id);
    }

    const existingChat = externalMessageId
      ? await this.chatRepository.findOne({
          where: { room_id: room.room_id, external_message_id: externalMessageId },
        })
      : null;

    const metadata = this.buildMediaMetadata(
      event.message,
      externalMessageId,
      platform.platforms_id,
      messageType,
    );

    let chat: Chat;
    if (existingChat) {
      existingChat.message = messageText ?? existingChat.message;
      existingChat.message_type = (messageType as ChatMessageType) ?? existingChat.message_type;
      if (metadata) existingChat.metadata = metadata;
      chat = await this.chatRepository.save(existingChat);
    } else {
      chat = this.chatRepository.create({
        room_id: room.room_id,
        sender_type: ChatSenderType.CUSTOMER,
        sender_id: customerIdentity.customer_identity_id,
        direction: ChatDirection.IN,
        external_message_id: externalMessageId ?? null,
        message: messageText ?? '',
        message_type: (messageType as ChatMessageType) || ChatMessageType.TEXT,
        metadata,
        is_read: false,
      });
      chat = await this.chatRepository.save(chat);
    }

    await this.roomService.incrementUnread(room.room_id, messageText);

    this.chatEmitterService.emitNewMessage(room.room_id, {
      ...chat,
      sender_name: customerIdentity.display_name ?? customerIdentity.external_user_id,
    });
    this.chatEmitterService.emitRoomUpdated(room.room_id, {
      unread_count: (room.unread_count ?? 0) + 1,
      last_message_at: new Date().toISOString(),
      last_message_text: messageText,
    });

    // Background: upload LINE-hosted media to Cloudinary for a permanent URL
    if (isMediaType && messageType !== 'STICKER' && externalMessageId && this.cloudinaryService.isConfigured()) {
      this.uploadInboundMediaToCloudinary(
        chat.chat_id,
        room.room_id,
        platform.platforms_id,
        externalMessageId,
        messageType,
        customerIdentity.display_name ?? customerIdentity.external_user_id,
        customerIdentity.customer_identity_id,
      ).catch((err) =>
        this.logger.warn(`Cloudinary upload failed for chat ${chat.chat_id}: ${err.message}`),
      );
    }

    return {
      platform_id: platform.platforms_id,
      customer_identity_id: customerIdentity.customer_identity_id,
      room_id: room.room_id,
      chat,
    };
  }

  async findByRoom(
    roomId: string,
    limit: number = 20,
    cursor?: string,
  ): Promise<{ items: Chat[]; next_cursor: string | null; hasMore: boolean }> {
    const qb = this.chatRepository
      .createQueryBuilder('chat')
      .where('chat.room_id = :roomId', { roomId })
      .orderBy('chat.create_at', 'DESC')
      .take(limit + 1);

    if (cursor) {
      const cursorChat = await this.chatRepository.findOne({
        where: { chat_id: cursor, room_id: roomId },
      });
      if (cursorChat) {
        qb.andWhere('chat.create_at < :cursorAt', {
          cursorAt: cursorChat.create_at,
        });
      }
    }

    const items = await qb.getMany();
    const hasMore = items.length > limit;
    const result = hasMore ? items.slice(0, limit) : items;
    const next_cursor =
      hasMore && result.length > 0 ? result[result.length - 1].chat_id : null;

    return {
      items: result.reverse(),
      next_cursor,
      hasMore,
    };
  }

  async findOne(chatId: string): Promise<Chat> {
    const chat = await this.chatRepository.findOne({
      where: { chat_id: chatId },
      relations: ['room'],
    });
    if (!chat) {
      throw new AppException(ErrorCode.CHAT_MESSAGE_NOT_FOUND, 'Chat not found', HttpStatus.NOT_FOUND);
    }
    return chat;
  }

  /**
   * List chats in a room with polymorphic sender_name (admin → username, customer → external_user_id, system → 'system').
   * Use for display in chat UI.
   */
  async findByRoomWithSenderNames(
    roomId: string,
    limit: number = 20,
    cursor?: string,
    direction: 'older' | 'newer' = 'older',
  ): Promise<{ items: (Chat & { sender_name: string })[]; next_cursor: string | null; hasMore: boolean }> {
    const qb = this.chatRepository
      .createQueryBuilder('c')
      .leftJoin('users', 'u', "c.sender_type = 'ADMIN' AND c.sender_id = u.user_id")
      .leftJoin('customer_identities', 'ci', "c.sender_type = 'CUSTOMER' AND c.sender_id = ci.customer_identity_id")
      .addSelect(
        `CASE
          WHEN c.sender_type = 'ADMIN' THEN u.username
          WHEN c.sender_type = 'CUSTOMER' THEN COALESCE(ci.display_name, ci.external_user_id)
          ELSE 'system'
        END`,
        'sender_name',
      )
      .where('c.room_id = :roomId', { roomId })
      .orderBy('c.create_at', 'DESC')
      .take(limit + 1);

    if (cursor) {
      const cursorChat = await this.chatRepository.findOne({
        where: { chat_id: cursor, room_id: roomId },
      });
      if (cursorChat) {
        if (direction === 'older') {
          // Load older messages (before cursor)
          qb.andWhere('c.create_at < :cursorAt', { cursorAt: cursorChat.create_at });
        } else {
          // Load newer messages (after cursor) - for realtime updates
          qb.andWhere('c.create_at > :cursorAt', { cursorAt: cursorChat.create_at });
        }
      }
    }

    const raw = await qb.getRawAndEntities();
    const items = raw.entities.map((chat, i) => ({
      ...chat,
      sender_name: (raw.raw[i]?.sender_name as string) ?? 'system',
    }));
    const hasMore = items.length > limit;
    const result = hasMore ? items.slice(0, limit) : items;
    const next_cursor = hasMore && result.length > 0 ? result[result.length - 1].chat_id : null;

    // Return in chronological order (oldest first) for display
    return {
      items: result.reverse(),
      next_cursor,
      hasMore,
    };
  }

  /**
   * Send message to platform (LINE, Facebook, Instagram)
   * Called when admin sends a message from the chat UI
   */
  async sendMessageToPlatform(
    roomId: string,
    content: string,
    messageType: ChatMessageType = ChatMessageType.TEXT,
  ): Promise<void> {
    const room = await this.roomService.findOne(roomId);
    if (!room) {
      throw new AppException(ErrorCode.ROOM_NOT_FOUND, 'Room not found', HttpStatus.NOT_FOUND);
    }
    const platform = await this.platformService.findOne(room.platforms_id);
    if (!room.customer_identity_id) {
      throw new AppException(ErrorCode.CUSTOMER_IDENTITY_NOT_FOUND, 'Room has no customer identity', HttpStatus.NOT_FOUND);
    }
    const customerIdentity = await this.customerIdentityService.findOne(room.customer_identity_id);

    if (!customerIdentity?.external_user_id) {
      throw new AppException(ErrorCode.CUSTOMER_IDENTITY_NOT_FOUND, 'Customer identity not found', HttpStatus.NOT_FOUND);
    }

    const externalUserId = customerIdentity.external_user_id;
    try {
      switch (platform.platform_type) {
        case PlatformType.LINE:
          const isConfigured = await this.lineMessagingService.isConfigured(platform.platforms_id);
          if (isConfigured) {
            await this.lineMessagingService.sendTextMessage(platform.platforms_id, externalUserId, content);
            this.logger.debug('LINE message sent successfully');
          } 
          break;

        case PlatformType.FACEBOOK:
          if (this.facebookMessagingService.isConfigured()) {
            await this.facebookMessagingService.sendTextMessage(externalUserId, content);
          } else {
            this.logger.warn('Facebook not configured, message not sent');
          }
          break;

        case PlatformType.INSTAGRAM:
          if (this.instagramMessagingService.isConfigured()) {
            await this.instagramMessagingService.sendTextMessage(externalUserId, content);
          } else {
            this.logger.warn('Instagram not configured, message not sent');
          }
          break;

        default:
          this.logger.warn(`Platform ${platform.platform_type} not yet implemented for outbound messaging`);
      }
    } catch (error) {
      this.logger.error(`Failed to send message to ${platform.platform_type}: ${error.message}`);
      throw new AppException(
        ErrorCode.PLATFORM_SEND_FAILED,
        `Failed to send message: ${error.message}`,
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  /**
   * Send image to platform (LINE). For data URIs, we skip since LINE needs public URLs.
   */
  async sendImageToPlatform(roomId: string, imageUrl: string): Promise<void> {
    if (imageUrl.startsWith('data:')) {
      this.logger.debug('Skipping LINE image send for data URI (requires public URL)');
      return;
    }
    const room = await this.roomService.findOne(roomId);
    if (!room) return;
    const platform = await this.platformService.findOne(room.platforms_id);
    if (!room.customer_identity_id) return;
    const customer = await this.customerIdentityService.findOne(room.customer_identity_id);
    if (!customer?.external_user_id) return;

    if (platform.platform_type === PlatformType.LINE) {
      const isConfigured = await this.lineMessagingService.isConfigured(platform.platforms_id);
      if (isConfigured) {
        await this.lineMessagingService.sendImageMessage(platform.platforms_id, customer.external_user_id, imageUrl);
      }
    }
  }

  /**
   * Fetch LINE-hosted media content and upload to Cloudinary.
   * Runs in background — updates the chat metadata with the permanent Cloudinary URL.
   */
  private async uploadInboundMediaToCloudinary(
    chatId: string,
    roomId: string,
    platformId: string,
    externalMessageId: string,
    messageType: string,
    senderName: string,
    senderId: string,
  ): Promise<void> {
    const { data, contentType } = await this.lineMessagingService.getMessageContent(platformId, externalMessageId);

    const resourceType = contentType.startsWith('image/')
      ? 'image' as const
      : contentType.startsWith('video/')
        ? 'video' as const
        : 'raw' as const;

    const uploaded = await this.cloudinaryService.uploadBuffer(data, {
      folder: `chat/room_${roomId}/user_${senderId}`,
      resourceType,
    });

    const chat = await this.chatRepository.findOne({ where: { chat_id: chatId } });
    if (!chat) return;

    const existingMeta = (chat.metadata as Record<string, unknown>) ?? {};
    chat.metadata = {
      ...existingMeta,
      url: uploaded.secure_url,
      previewUrl: uploaded.secure_url,
      cloudinaryPublicId: uploaded.public_id,
    };
    await this.chatRepository.save(chat);

    this.chatEmitterService.emitNewMessage(roomId, {
      ...chat,
      sender_name: senderName,
    });

    this.logger.debug(`Uploaded LINE media ${externalMessageId} to Cloudinary: ${uploaded.secure_url}`);
  }

  /**
   * Build metadata with content URLs for media messages.
   *
   * LINE contentProvider.type == "line"  → proxy via /chats/content/:msgId
   * LINE contentProvider.type == "external" → use originalContentUrl directly
   * LINE sticker → LINE CDN sticker URL
   * LINE file → proxy + keep fileName / fileSize
   */
  private buildMediaMetadata(
    message: Record<string, unknown> | unknown,
    externalMessageId: string | undefined,
    platformId: string,
    messageType: string,
  ): Record<string, unknown> | null {
    if (typeof message !== 'object' || !message) return null;
    const msg = message as Record<string, unknown>;

    // Sticker — resolve from LINE CDN
    if (messageType === 'STICKER') {
      const stickerId = msg.stickerId as string | undefined;
      const packageId = msg.packageId as string | undefined;
      if (stickerId) {
        const resourceType = (msg.stickerResourceType as string) ?? 'STATIC';
        return {
          stickerId,
          packageId,
          stickerResourceType: resourceType,
          url: `https://stickershop.line-scdn.net/stickershop/v1/sticker/${stickerId}/android/sticker.png;compress=true`,
        };
      }
      return null;
    }

    // Image / Video / Audio / File — need a content URL
    const downloadableTypes = ['IMAGE', 'VIDEO', 'AUDIO', 'FILE'];
    if (!downloadableTypes.includes(messageType)) return null;

    const contentProvider = msg.contentProvider as
      | { type?: string; originalContentUrl?: string; previewImageUrl?: string }
      | undefined;

    // External provider already has a public URL
    if (contentProvider?.type === 'external' && contentProvider.originalContentUrl) {
      return {
        url: contentProvider.originalContentUrl,
        previewUrl: contentProvider.previewImageUrl || contentProvider.originalContentUrl,
        ...(msg.fileName ? { fileName: msg.fileName } : {}),
        ...(msg.fileSize ? { fileSize: msg.fileSize } : {}),
      };
    }

    // LINE-hosted content — proxy through our backend
    if (externalMessageId) {
      const proxyUrl = `/chats/content/${externalMessageId}?platformId=${platformId}`;
      return {
        url: proxyUrl,
        previewUrl: proxyUrl,
        ...(msg.fileName ? { fileName: msg.fileName } : {}),
        ...(msg.fileSize ? { fileSize: msg.fileSize } : {}),
      };
    }

    return null;
  }

  /**
   * Fetch customer profile from external platform API and update CustomerIdentity.
   * Non-critical — callers should catch errors so webhook processing continues.
   */
  private async fetchAndUpdateCustomerProfile(
    platform: { platforms_id: string; platform_type: PlatformType },
    customerIdentity: import('../../entities').CustomerIdentity,
    externalUserId: string,
  ): Promise<import('../../entities').CustomerIdentity> {
    let displayName: string | undefined;
    let avatarUrl: string | undefined;

    switch (platform.platform_type) {
      case PlatformType.LINE: {
        const isConfigured = await this.lineMessagingService.isConfigured(platform.platforms_id);
        if (!isConfigured) break;
        const profile = await this.lineMessagingService.getUserProfile(
          platform.platforms_id,
          externalUserId,
        );
        displayName = profile.displayName;
        avatarUrl = profile.pictureUrl;
        break;
      }
      default:
        this.logger.debug(`Profile fetch not implemented for ${platform.platform_type}`);
        return customerIdentity;
    }

    if (displayName || avatarUrl) {
      return this.customerIdentityService.updateProfile(
        customerIdentity.customer_identity_id,
        displayName,
        avatarUrl,
      );
    }
    return customerIdentity;
  }
}
