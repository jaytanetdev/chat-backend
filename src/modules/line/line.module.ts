import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LineMessagingService } from './line-messaging.service';
import { LineWebhookService } from './line-webhook.service';

@Module({
  imports: [ConfigModule],
  providers: [LineMessagingService, LineWebhookService],
  exports: [LineMessagingService, LineWebhookService],
})
export class LineModule {}