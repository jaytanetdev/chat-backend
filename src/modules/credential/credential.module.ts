import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Credential } from '../../entities';
import { CredentialService } from './credential.service';
import { CredentialController } from './credential.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Credential])],
  controllers: [CredentialController],
  providers: [CredentialService],
  exports: [CredentialService],
})
export class CredentialModule {}
