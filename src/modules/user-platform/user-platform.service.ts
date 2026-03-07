import { Injectable, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserPlatform } from '../../entities';
import { AppException, ErrorCode } from '../../common/errors';
import { AssignUserPlatformDto } from './dto/assign-user-platform.dto';

@Injectable()
export class UserPlatformService {
  constructor(
    @InjectRepository(UserPlatform)
    private readonly userPlatformRepository: Repository<UserPlatform>,
  ) {}

  async assign(dto: AssignUserPlatformDto): Promise<UserPlatform> {
    const existing = await this.userPlatformRepository.findOne({
      where: { user_id: dto.user_id, platforms_id: dto.platforms_id },
      relations: ['user', 'platform'],
    });
    if (existing) return existing;
    const link = this.userPlatformRepository.create(dto);
    return this.userPlatformRepository.save(link);
  }

  async findAll(): Promise<UserPlatform[]> {
    return this.userPlatformRepository.find({
      relations: ['user', 'platform'],
    });
  }

  async findByUser(userId: string): Promise<UserPlatform[]> {
    return this.userPlatformRepository.find({
      where: { user_id: userId },
      relations: ['platform'],
    });
  }

  async findByPlatform(platformId: string): Promise<UserPlatform[]> {
    return this.userPlatformRepository.find({
      where: { platforms_id: platformId },
      relations: ['user'],
    });
  }

  async remove(userId: string, platformId: string): Promise<void> {
    const link = await this.userPlatformRepository.findOne({
      where: { user_id: userId, platforms_id: platformId },
    });
    if (!link) {
      throw new AppException(ErrorCode.USER_PLATFORM_NOT_FOUND, 'User-Platform assignment not found', HttpStatus.NOT_FOUND);
    }
    await this.userPlatformRepository.remove(link);
  }
}
