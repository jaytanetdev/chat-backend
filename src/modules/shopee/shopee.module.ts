import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ShopeeMessagingService } from './shopee-messaging.service';
import { ShopeePollingService } from './shopee-polling.service';

@Module({
  imports: [ConfigModule],
  providers: [ShopeeMessagingService, ShopeePollingService],
  exports: [ShopeeMessagingService, ShopeePollingService],
})
export class ShopeeModule {}