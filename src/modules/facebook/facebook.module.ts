import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CredentialModule } from '../credential/credential.module';
import { FacebookMessagingService } from './facebook-messaging.service';
import { FacebookWebhookService } from './facebook-webhook.service';

@Module({
  imports: [ConfigModule, CredentialModule],
  providers: [FacebookMessagingService, FacebookWebhookService],
  exports: [FacebookMessagingService, FacebookWebhookService],
})
export class FacebookModule {}
