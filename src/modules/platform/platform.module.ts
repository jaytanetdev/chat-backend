import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Platform } from '../../entities';
import { PlatformService } from './platform.service';
import { PlatformController } from './platform.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Platform])],
  controllers: [PlatformController],
  providers: [PlatformService],
  exports: [PlatformService],
})
export class PlatformModule {}
