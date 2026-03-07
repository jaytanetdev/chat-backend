import { Injectable, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Credential } from '../../entities';
import { AppException, ErrorCode } from '../../common/errors';
import { CreateCredentialDto } from './dto/create-credential.dto';
import { UpdateCredentialDto } from './dto/update-credential.dto';

@Injectable()
export class CredentialService {
  constructor(
    @InjectRepository(Credential)
    private readonly credentialRepository: Repository<Credential>,
  ) {}

  async create(dto: CreateCredentialDto, createBy: string): Promise<Credential> {
    const credential = this.credentialRepository.create({
      platforms_id: dto.platforms_id,
      api_key: dto.api_key ?? null,
      access_token: dto.access_token ?? null,
      secret: dto.secret ?? null,
      verify_token: dto.verify_token ?? null,
      refresh_token: dto.refresh_token ?? null,
      expires_at: dto.expires_at ? new Date(dto.expires_at) : null,
      create_by: createBy,
      update_by: createBy,
    });
    return this.credentialRepository.save(credential);
  }

  private stripSensitive<T extends Credential>(c: T): Omit<T, 'api_key' | 'access_token' | 'secret' | 'refresh_token'> {
    const { api_key, access_token, secret, refresh_token, ...rest } = c;
    return rest;
  }

  async findAll(): Promise<Omit<Credential, 'api_key' | 'access_token' | 'secret' | 'refresh_token'>[]> {
    const list = await this.credentialRepository.find({
      relations: ['platform'],
      order: { create_at: 'DESC' },
    });
    return list.map((c) => this.stripSensitive(c));
  }

  async findByPlatform(platformId: string): Promise<Omit<Credential, 'api_key' | 'access_token' | 'secret' | 'refresh_token'>[]> {
    const list = await this.credentialRepository.find({
      where: { platforms_id: platformId },
      relations: ['platform'],
      order: { create_at: 'DESC' },
    });
    return list.map((c) => this.stripSensitive(c));
  }

  async findOne(id: string): Promise<Omit<Credential, 'api_key' | 'access_token' | 'secret' | 'refresh_token'>> {
    const credential = await this.credentialRepository.findOne({
      where: { credential_id: id },
      relations: ['platform'],
    });
    if (!credential) {
      throw new AppException(ErrorCode.CREDENTIAL_NOT_FOUND, 'Credential not found', HttpStatus.NOT_FOUND);
    }
    return this.stripSensitive(credential);
  }

  async update(
    id: string,
    dto: UpdateCredentialDto,
    updateBy: string,
  ): Promise<Omit<Credential, 'api_key' | 'access_token' | 'secret' | 'refresh_token'>> {
    const credential = await this.credentialRepository.findOne({
      where: { credential_id: id },
    });
    if (!credential) {
      throw new AppException(ErrorCode.CREDENTIAL_NOT_FOUND, 'Credential not found', HttpStatus.NOT_FOUND);
    }
    Object.assign(credential, dto, { update_by: updateBy });
    if (dto.expires_at !== undefined) credential.expires_at = dto.expires_at ? new Date(dto.expires_at) : null;
    const saved = await this.credentialRepository.save(credential);
    return this.stripSensitive(saved);
  }

  async remove(id: string): Promise<void> {
    const credential = await this.credentialRepository.findOne({
      where: { credential_id: id },
    });
    if (!credential) {
      throw new AppException(ErrorCode.CREDENTIAL_NOT_FOUND, 'Credential not found', HttpStatus.NOT_FOUND);
    }
    await this.credentialRepository.remove(credential);
  }
}
