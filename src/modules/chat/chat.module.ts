import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Chat, ChatReadReceipt, User } from '../../entities';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';
import { ChatEmitterService } from './chat-emitter.service';
import { PlatformModule } from '../platform/platform.module';
import { RoomModule } from '../room/room.module';
import { CustomerIdentityModule } from '../customer-identity/customer-identity.module';
import { UserPlatformModule } from '../user-platform/user-platform.module';
import { AuthModule } from '../auth/auth.module';
import { LineModule } from '../line/line.module';
import { FacebookModule } from '../facebook/facebook.module';
import { InstagramModule } from '../instagram/instagram.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Chat, ChatReadReceipt, User]),
    PlatformModule,
    RoomModule,
    CustomerIdentityModule,
    UserPlatformModule,
    AuthModule,
    LineModule,
    FacebookModule,
    InstagramModule,
  ],
  controllers: [ChatController],
  providers: [ChatEmitterService, ChatService, ChatGateway],
  exports: [ChatService, ChatEmitterService],
})
export class ChatModule {}
