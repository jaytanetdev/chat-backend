import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LazadaMessagingService } from './lazada-messaging.service';
import { LazadaPollingService } from './lazada-polling.service';

@Module({
  imports: [ConfigModule],
  providers: [LazadaMessagingService, LazadaPollingService],
  exports: [LazadaMessagingService, LazadaPollingService],
})
export class LazadaModule {}