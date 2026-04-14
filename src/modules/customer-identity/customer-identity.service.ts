import { Injectable, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomerIdentity } from '../../entities';
import { AppException, ErrorCode } from '../../common/errors';
import { CreateCustomerIdentityDto } from './dto/create-customer-identity.dto';

@Injectable()
export class CustomerIdentityService {
  constructor(
    @InjectRepository(CustomerIdentity)
    private readonly customerIdentityRepository: Repository<CustomerIdentity>,
  ) {}

  async create(dto: CreateCustomerIdentityDto): Promise<CustomerIdentity> {
    const existing = await this.customerIdentityRepository.findOne({
      where: {
        platform_id: dto.platform_id,
        external_user_id: dto.external_user_id,
      },
    });
    if (existing) return existing;
    const entity = this.customerIdentityRepository.create({
      platform_id: dto.platform_id,
      external_user_id: dto.external_user_id,
      display_name: dto.display_name ?? null,
      avatar_url: dto.avatar_url ?? null,
    });
    return this.customerIdentityRepository.save(entity);
  }

  async findOrCreate(
    platformId: string,
    externalUserId: string,
    displayName?: string,
  ): Promise<CustomerIdentity> {
    let identity = await this.customerIdentityRepository.findOne({
      where: { platform_id: platformId, external_user_id: externalUserId },
      relations: ['platform'],
    });
    if (!identity) {
      identity = await this.create({
        platform_id: platformId,
        external_user_id: externalUserId,
        display_name: displayName,
      });
    } else if (displayName && identity.display_name !== displayName) {
      identity.display_name = displayName;
      identity = await this.customerIdentityRepository.save(identity);
    }
    return identity;
  }

  async updateProfile(
    id: string,
    displayName?: string | null,
    avatarUrl?: string | null,
  ): Promise<CustomerIdentity> {
    const identity = await this.findOne(id);
    if (displayName !== undefined && displayName !== null) {
      identity.display_name = displayName;
    }
    if (avatarUrl !== undefined && avatarUrl !== null) {
      identity.avatar_url = avatarUrl;
    }
    return this.customerIdentityRepository.save(identity);
  }

  async findAll(): Promise<CustomerIdentity[]> {
    return this.customerIdentityRepository.find({
      relations: ['platform'],
      order: { created_at: 'DESC' },
    });
  }

  async findByPlatform(platformId: string): Promise<CustomerIdentity[]> {
    return this.customerIdentityRepository.find({
      where: { platform_id: platformId },
      relations: ['platform'],
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: string): Promise<CustomerIdentity> {
    const identity = await this.customerIdentityRepository.findOne({
      where: { customer_identity_id: id },
      relations: ['platform'],
    });
    if (!identity) {
      throw new AppException(ErrorCode.CUSTOMER_IDENTITY_NOT_FOUND, 'Customer identity not found', HttpStatus.NOT_FOUND);
    }
    return identity;
  }

  async remove(id: string): Promise<void> {
    const identity = await this.findOne(id);
    await this.customerIdentityRepository.remove(identity);
  }
}
