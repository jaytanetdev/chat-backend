import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CredentialModule } from '../credential/credential.module';
import { InstagramMessagingService } from './instagram-messaging.service';
import { InstagramWebhookService } from './instagram-webhook.service';

@Module({
  imports: [ConfigModule, CredentialModule],
  providers: [InstagramMessagingService, InstagramWebhookService],
  exports: [InstagramMessagingService, InstagramWebhookService],
})
export class InstagramModule {}
