import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { LineModule } from '../line/line.module';
import { FacebookModule } from '../facebook/facebook.module';
import { InstagramModule } from '../instagram/instagram.module';

@Module({
  imports: [LineModule, FacebookModule, InstagramModule],
  controllers: [WebhooksController],
})
export class WebhooksModule {}