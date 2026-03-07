import { Injectable, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../../entities';
import { AppException, ErrorCode } from '../../common/errors';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const SALT_ROUNDS = 10;

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(dto: CreateUserDto, createBy?: string): Promise<User> {
    if (dto.role === UserRole.ADMIN) {
      if (!dto.username?.trim()) {
        throw new AppException(ErrorCode.USER_VALIDATION_ERROR, 'username required for ADMIN', HttpStatus.BAD_REQUEST);
      }
      if (!dto.password?.trim()) {
        throw new AppException(ErrorCode.USER_VALIDATION_ERROR, 'password required for ADMIN', HttpStatus.BAD_REQUEST);
      }
    }
    const hashed = dto.password
      ? await bcrypt.hash(dto.password, SALT_ROUNDS)
      : undefined;
    const user = this.userRepository.create({
      ...dto,
      password: hashed ?? undefined,
      create_by: createBy ?? dto.create_by ?? null,
      update_by: createBy ?? dto.create_by ?? null,
    });
    return this.userRepository.save(user);
  }

  async findAll(): Promise<User[]> {
    return this.userRepository.find({
      order: { create_at: 'DESC' },
    });
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { user_id: id } });
    if (!user) {
      throw new AppException(ErrorCode.USER_NOT_FOUND, 'User not found', HttpStatus.NOT_FOUND);
    }
    return user;
  }

  async update(id: string, dto: UpdateUserDto, updateBy: string): Promise<User> {
    const user = await this.findOne(id);
    if (dto.password) {
      (dto as Record<string, unknown>).password = await bcrypt.hash(
        dto.password,
        SALT_ROUNDS,
      );
    }
    Object.assign(user, dto, { update_by: updateBy });
    return this.userRepository.save(user);
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    await this.userRepository.remove(user);
  }

  async resetPasswordById(userId: string, newPassword: string): Promise<User> {
    const user = await this.findOne(userId);
    user.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
    return this.userRepository.save(user);
  }

  async resetPasswordByUsername(username: string, newPassword: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { username } });
    if (!user) {
      throw new AppException(ErrorCode.USER_NOT_FOUND, 'User not found', HttpStatus.NOT_FOUND);
    }
    user.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
    return this.userRepository.save(user);
  }
}
