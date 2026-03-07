import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FacebookMessagingService } from './facebook-messaging.service';

export interface FacebookWebhookEntry {
  id: string;
  time: number;
  messaging?: Array<{
    sender: { id: string };
    recipient: { id: string };
    timestamp: number;
    message?: {
      mid: string;
      text?: string;
      attachments?: Array<{
        type: string;
        payload: { url: string };
      }>;
      quick_reply?: {
        payload: string;
      };
    };
    postback?: {
      payload: string;
      title?: string;
    };
    delivery?: {
      mids: string[];
      watermark: number;
    };
    read?: {
      watermark: number;
    };
  }>;
}

export interface FacebookWebhookBody {
  object: 'page' | 'instagram';
  entry: FacebookWebhookEntry[];
}

@Injectable()
export class FacebookWebhookService {
  private readonly logger = new Logger(FacebookWebhookService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly facebookMessagingService: FacebookMessagingService,
  ) {}

  /**
   * Verify webhook for subscription
   */
  verifyWebhook(mode: string, token: string, challenge: string): string | null {
    const verifyToken = this.configService.get<string>('platforms.facebook.verifyToken');
    if (mode === 'subscribe' && token === verifyToken) {
      return challenge;
    }
    return null;
  }

  /**
   * Verify webhook signature
   */
  verifySignature(body: string, signature: string): boolean {
    const appSecret = this.configService.get<string>('platforms.facebook.appSecret');
    if (!appSecret) {
      this.logger.warn('Facebook app secret not configured, skipping signature verification');
      return true;
    }
    return this.facebookMessagingService.validateSignature(body, signature, appSecret);
  }

  /**
   * Process webhook events
   */
  async processWebhook(body: FacebookWebhookBody): Promise<{
    processed: number;
    errors: Array<{ entry: string; error: string }>;
  }> {
    const result = {
      processed: 0,
      errors: [] as Array<{ entry: string; error: string }>,
    };

    if (!body.entry || body.entry.length === 0) {
      this.logger.debug('No entries in webhook');
      return result;
    }

    for (const entry of body.entry) {
      try {
        await this.processEntry(entry);
        result.processed++;
      } catch (error) {
        this.logger.error(`Error processing Facebook entry: ${error.message}`, error.stack);
        result.errors.push({
          entry: entry.id,
          error: error.message,
        });
      }
    }

    return result;
  }

  private async processEntry(entry: FacebookWebhookEntry): Promise<void> {
    if (!entry.messaging || entry.messaging.length === 0) {
      return;
    }

    for (const event of entry.messaging) {
      try {
        await this.processMessagingEvent(event);
      } catch (error) {
        this.logger.error(`Error processing messaging event: ${error.message}`);
      }
    }
  }

  private async processMessagingEvent(event: any): Promise<void> {
    const senderId = event.sender?.id;
    const recipientId = event.recipient?.id;

    if (!senderId || !recipientId) {
      this.logger.warn('Missing sender or recipient ID');
      return;
    }

    if (event.message) {
      this.logger.debug(`Received message from ${senderId}: ${event.message.text || '(media)'}`);
    }

    if (event.postback) {
      this.logger.debug(`Postback from ${senderId}: ${event.postback.payload}`);
    }
  }
}