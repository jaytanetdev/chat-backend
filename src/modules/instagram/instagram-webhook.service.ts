import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InstagramMessagingService } from './instagram-messaging.service';

@Injectable()
export class InstagramWebhookService {
  private readonly logger = new Logger(InstagramWebhookService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly instagramMessagingService: InstagramMessagingService,
  ) {}

  /**
   * Verify webhook (same as Facebook)
   */
  verifyWebhook(mode: string, token: string, challenge: string): string | null {
    const verifyToken = this.configService.get<string>('platforms.instagram.verifyToken');
    if (mode === 'subscribe' && token === verifyToken) {
      this.logger.log('Instagram webhook verified');
      return challenge;
    }
    this.logger.warn('Instagram webhook verification failed');
    return null;
  }

  /**
   * Process Instagram webhook events
   * Note: Instagram uses the same webhook format as Facebook
   */
  async processWebhook(body: any): Promise<{
    processed: number;
    errors: Array<any>;
  }> {
    const result = { processed: 0, errors: [] as Array<any> };

    this.logger.debug('Processing Instagram webhook');
    result.processed++;

    return result;
  }
}