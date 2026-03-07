import { Injectable, Logger, RawBody } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LineMessagingService } from './line-messaging.service';

export interface LineWebhookEvent {
  type: 'message' | 'follow' | 'unfollow' | 'join' | 'leave' | 'postback' | 'beacon' | 'accountLink' | 'memberJoined' | 'memberLeft' | 'things';
  timestamp: number;
  source: {
    type: 'user' | 'group' | 'room';
    userId?: string;
    groupId?: string;
    roomId?: string;
  };
  message?: {
    id: string;
    type: string;
    text?: string;
    contentProvider?: {
      type: 'line' | 'external';
      originalContentUrl?: string;
      previewImageUrl?: string;
    };
    duration?: number;
    contentType?: string;
    fileName?: string;
    fileSize?: number;
  };
  replyToken?: string;
  postback?: {
    data: string;
    params?: Record<string, any>;
  };
  link?: {
    result: 'ok' | 'failed';
    nonce: string;
  };
}

export interface LineWebhookBody {
  destination: string;
  events: LineWebhookEvent[];
}

@Injectable()
export class LineWebhookService {
  private readonly logger = new Logger(LineWebhookService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly lineMessagingService: LineMessagingService,
  ) {}

  /**
   * Verify webhook signature
   */
  verifySignature(body: string, signature: string): boolean {
    const channelSecret = this.configService.get<string>('platforms.line.channelSecret');
    if (!channelSecret) {
      this.logger.warn('LINE channel secret not configured, skipping signature verification');
      return true; // In development, allow without verification
    }
    return this.lineMessagingService.validateSignature(body, signature, channelSecret);
  }

  /**
   * Process webhook events
   */
  async processWebhook(body: LineWebhookBody): Promise<{
    processed: number;
    errors: Array<{ event: string; error: string }>;
  }> {
    const result = {
      processed: 0,
      errors: [] as Array<{ event: string; error: string }>,
    };

    if (!body.events || body.events.length === 0) {
      this.logger.debug('No events in webhook');
      return result;
    }

    for (const event of body.events) {
      try {
        await this.processEvent(event, body.destination);
        result.processed++;
      } catch (error) {
        this.logger.error(`Error processing LINE event: ${error.message}`, error.stack);
        result.errors.push({
          event: event.type,
          error: error.message,
        });
      }
    }

    return result;
  }

  /**
   * Process individual event
   */
  private async processEvent(event: LineWebhookEvent, destination: string): Promise<void> {
    switch (event.type) {
      case 'message':
        await this.processMessageEvent(event, destination);
        break;
      case 'follow':
        await this.processFollowEvent(event);
        break;
      case 'unfollow':
        await this.processUnfollowEvent(event);
        break;
      case 'join':
        this.logger.debug(`Bot joined: ${event.source.groupId || event.source.roomId}`);
        break;
      case 'leave':
        this.logger.debug(`Bot left: ${event.source.groupId || event.source.roomId}`);
        break;
      case 'postback':
        await this.processPostbackEvent(event);
        break;
      default:
        this.logger.debug(`Unhandled event type: ${event.type}`);
    }
  }

  /**
   * Process message event
   */
  private async processMessageEvent(event: LineWebhookEvent, destination: string): Promise<void> {
    if (!event.message || !event.source.userId) {
      this.logger.warn('Message event missing message or userId');
      return;
    }

    const userId = event.source.userId;
    const messageType = event.message.type;
    const messageId = event.message.id;

    this.logger.debug(`Received ${messageType} message from ${userId}: ${event.message.text || '(media)'}`);

    // The actual processing is handled by ChatService.processInboundWebhook
    // This service just validates and prepares the data
  }

  /**
   * Process follow event (user adds friend)
   */
  private async processFollowEvent(event: LineWebhookEvent): Promise<void> {
    if (!event.source.userId) return;

    this.logger.log(`User followed: ${event.source.userId}`);

    // Could send welcome message here
    // await this.lineMessagingService.sendTextMessage(event.source.userId, 'Welcome!');
  }

  /**
   * Process unfollow event (user blocks)
   */
  private async processUnfollowEvent(event: LineWebhookEvent): Promise<void> {
    if (!event.source.userId) return;

    this.logger.log(`User unfollowed: ${event.source.userId}`);
    // Could update user status in database
  }

  /**
   * Process postback event (user clicks button)
   */
  private async processPostbackEvent(event: LineWebhookEvent): Promise<void> {
    if (!event.postback || !event.source.userId) return;

    this.logger.debug(`Postback from ${event.source.userId}: ${event.postback.data}`);
    // Handle postback data
  }

  /**
   * Get event details for logging/debugging
   */
  getEventSummary(event: LineWebhookEvent): string {
    const userId = event.source.userId || 'unknown';
    const type = event.type;
    const timestamp = new Date(event.timestamp).toISOString();
    return `[${timestamp}] ${type} from ${userId}`;
  }
}