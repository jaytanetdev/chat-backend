import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { InstagramMessagingService } from './instagram-messaging.service';
import { InstagramWebhookService } from './instagram-webhook.service';

@Module({
  imports: [ConfigModule],
  providers: [InstagramMessagingService, InstagramWebhookService],
  exports: [InstagramMessagingService, InstagramWebhookService],
})
export class InstagramModule {}