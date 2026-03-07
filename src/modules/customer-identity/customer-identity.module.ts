import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerIdentity } from '../../entities';
import { CustomerIdentityService } from './customer-identity.service';
import { CustomerIdentityController } from './customer-identity.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CustomerIdentity])],
  controllers: [CustomerIdentityController],
  providers: [CustomerIdentityService],
  exports: [CustomerIdentityService],
})
export class CustomerIdentityModule {}
