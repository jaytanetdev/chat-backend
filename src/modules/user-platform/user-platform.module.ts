import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserPlatform } from '../../entities';
import { UserPlatformService } from './user-platform.service';
import { UserPlatformController } from './user-platform.controller';

@Module({
  imports: [TypeOrmModule.forFeature([UserPlatform])],
  controllers: [UserPlatformController],
  providers: [UserPlatformService],
  exports: [UserPlatformService],
})
export class UserPlatformModule {}
