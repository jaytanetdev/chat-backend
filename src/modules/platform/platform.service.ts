import { Injectable, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Platform } from '../../entities';
import { AppException, ErrorCode } from '../../common/errors';
import { CreatePlatformDto } from './dto/create-platform.dto';
import { UpdatePlatformDto } from './dto/update-platform.dto';

@Injectable()
export class PlatformService {
  constructor(
    @InjectRepository(Platform)
    private readonly platformRepository: Repository<Platform>,
  ) {}

  async create(dto: CreatePlatformDto, createBy: string): Promise<Platform> {
    const platform = this.platformRepository.create({
      platform_type: dto.platform_type,
      external_account_id: dto.external_account_id,
      platform_name: dto.platform_name ?? null,
      shop_id: dto.shop_id,
      is_active: dto.is_active ?? true,
      create_by: createBy,
      update_by: createBy,
    });
    return this.platformRepository.save(platform);
  }

  async findAll(): Promise<Platform[]> {
    return this.platformRepository.find({
      relations: ['shop'],
      order: { create_at: 'DESC' },
    });
  }

  async findByShop(shopId: string): Promise<Platform[]> {
    return this.platformRepository.find({
      where: { shop_id: shopId },
      relations: ['shop'],
      order: { create_at: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Platform> {
    const platform = await this.platformRepository.findOne({
      where: { platforms_id: id },
      relations: ['shop'],
    });
    if (!platform) {
      throw new AppException(ErrorCode.CHAT_PLATFORM_NOT_FOUND, 'Platform not found', HttpStatus.NOT_FOUND);
    }
    return platform;
  }

  async findOneByExternalAccountId(externalAccountId: string): Promise<Platform | null> {
    return this.platformRepository.findOne({
      where: { external_account_id: externalAccountId, is_active: true },
      relations: ['shop'],
    });
  }

  async update(
    id: string,
    dto: UpdatePlatformDto,
    updateBy: string,
  ): Promise<Platform> {
    const platform = await this.findOne(id);
    Object.assign(platform, dto, { update_by: updateBy });
    return this.platformRepository.save(platform);
  }

  async remove(id: string): Promise<void> {
    const platform = await this.findOne(id);
    await this.platformRepository.remove(platform);
  }
}
