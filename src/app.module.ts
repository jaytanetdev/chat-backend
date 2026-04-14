import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { configuration } from './config';
import {
  Shop,
  Platform,
  Credential,
  CustomerIdentity,
  User,
  UserPlatform,
  Room,
  RoomMember,
  Chat,
  ChatReadReceipt,
  QuickReply,
} from './entities';
import { AuthModule } from './modules/auth/auth.module';
import { ShopModule } from './modules/shop/shop.module';
import { PlatformModule } from './modules/platform/platform.module';
import { CredentialModule } from './modules/credential/credential.module';
import { UserModule } from './modules/user/user.module';
import { RoomModule } from './modules/room/room.module';
import { ChatModule } from './modules/chat/chat.module';
import { CustomerIdentityModule } from './modules/customer-identity/customer-identity.module';
import { UserPlatformModule } from './modules/user-platform/user-platform.module';
import { LineModule } from './modules/line/line.module';
import { FacebookModule } from './modules/facebook/facebook.module';
import { InstagramModule } from './modules/instagram/instagram.module';
import { ShopeeModule } from './modules/shopee/shopee.module';
import { LazadaModule } from './modules/lazada/lazada.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { QuickReplyModule } from './modules/quick-reply/quick-reply.module';
import { CloudinaryModule } from './modules/cloudinary/cloudinary.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('database.host'),
        port: configService.get('database.port'),
        username: configService.get('database.username'),
        password: configService.get('database.password'),
        database: configService.get('database.database'),
        entities: [Shop, Platform, Credential, CustomerIdentity, User, UserPlatform, Room, RoomMember, Chat, ChatReadReceipt, QuickReply],
        synchronize: configService.get('nodeEnv') === 'development',
      }),
      inject: [ConfigService],
    }),
    CloudinaryModule,
    AuthModule,
    ShopModule,
    PlatformModule,
    CredentialModule,
    UserModule,
    RoomModule,
    ChatModule,
    CustomerIdentityModule,
    UserPlatformModule,
    LineModule,
    FacebookModule,
    InstagramModule,
    ShopeeModule,
    LazadaModule,
    WebhooksModule,
    QuickReplyModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
