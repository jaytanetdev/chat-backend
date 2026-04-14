import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { LineModule } from '../line/line.module';
import { FacebookModule } from '../facebook/facebook.module';
import { InstagramModule } from '../instagram/instagram.module';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [LineModule, FacebookModule, InstagramModule, ChatModule],
  controllers: [WebhooksController],
})
export class WebhooksModule {}