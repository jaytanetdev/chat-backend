import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuickReply } from '../../entities';
import { QuickReplyService } from './quick-reply.service';
import { QuickReplyController } from './quick-reply.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([QuickReply]), AuthModule],
  controllers: [QuickReplyController],
  providers: [QuickReplyService],
  exports: [QuickReplyService],
})
export class QuickReplyModule {}
