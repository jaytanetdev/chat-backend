import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FacebookMessagingService } from './facebook-messaging.service';
import { FacebookWebhookService } from './facebook-webhook.service';

@Module({
  imports: [ConfigModule],
  providers: [FacebookMessagingService, FacebookWebhookService],
  exports: [FacebookMessagingService, FacebookWebhookService],
})
export class FacebookModule {}