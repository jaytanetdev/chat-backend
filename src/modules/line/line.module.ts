import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Credential } from '../../entities';
import { CredentialModule } from '../credential/credential.module';
import { LineMessagingService } from './line-messaging.service';
import { LineWebhookService } from './line-webhook.service';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Credential]),
    CredentialModule,
  ],
  providers: [LineMessagingService, LineWebhookService],
  exports: [LineMessagingService, LineWebhookService],
})
export class LineModule {}