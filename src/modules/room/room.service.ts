import { Injectable, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Room, RoomMember, RoomMemberRole, RoomStatus } from '../../entities';
import { AppException, ErrorCode } from '../../common/errors';
import { CreateRoomDto } from './dto/create-room.dto';

@Injectable()
export class RoomService {
  constructor(
    @InjectRepository(Room)
    private readonly roomRepository: Repository<Room>,
    @InjectRepository(RoomMember)
    private readonly roomMemberRepository: Repository<RoomMember>,
  ) {}

  async create(dto: CreateRoomDto): Promise<Room> {
    const room = this.roomRepository.create({
      platforms_id: dto.platforms_id,
      customer_identity_id: dto.customer_identity_id,
      assigned_user_id: dto.assigned_user_id ?? null,
      last_message_at: dto.last_message_at ? new Date(dto.last_message_at) : null,
      status: dto.status ?? RoomStatus.ACTIVE,
    });
    return this.roomRepository.save(room);
  }

  async findAll(): Promise<Room[]> {
    return this.roomRepository.find({
      relations: ['platform', 'customer_identity', 'assigned_user', 'room_members', 'room_members.user'],
      order: { last_message_at: { direction: 'DESC', nulls: 'LAST' } },
    });
  }

  async findByPlatform(platformId: string): Promise<Room[]> {
    return this.roomRepository.find({
      where: { platforms_id: platformId },
      relations: ['platform', 'customer_identity', 'assigned_user', 'room_members', 'room_members.user'],
      order: { last_message_at: { direction: 'DESC', nulls: 'LAST' } },
    });
  }

  async findPaginated(params: {
    page?: number;
    limit?: number;
    platformType?: string;
    search?: string;
  }): Promise<{ items: Room[]; total: number; page: number; limit: number; hasMore: boolean }> {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(50, Math.max(1, params.limit ?? 20));

    const qb = this.roomRepository
      .createQueryBuilder('room')
      .leftJoinAndSelect('room.platform', 'platform')
      .leftJoinAndSelect('room.customer_identity', 'customer_identity')
      .leftJoinAndSelect('room.assigned_user', 'assigned_user')
      .leftJoinAndSelect('room.room_members', 'room_members')
      .leftJoinAndSelect('room_members.user', 'user');

    if (params.platformType) {
      qb.andWhere('platform.platform_type = :platformType', { platformType: params.platformType });
    }

    if (params.search?.trim()) {
      qb.andWhere(
        '(customer_identity.display_name ILIKE :search OR customer_identity.external_user_id ILIKE :search)',
        { search: `%${params.search.trim()}%` },
      );
    }

    qb.orderBy('room.last_message_at', 'DESC', 'NULLS LAST');

    const total = await qb.getCount();
    const items = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return { items, total, page, limit, hasMore: page * limit < total };
  }

  async findOne(id: string): Promise<Room> {
    const room = await this.roomRepository.findOne({
      where: { room_id: id },
      relations: ['platform', 'customer_identity', 'assigned_user', 'room_members', 'room_members.user'],
    });
    if (!room) {
      throw new AppException(ErrorCode.CHAT_ROOM_NOT_FOUND, 'Room not found', HttpStatus.NOT_FOUND);
    }
    return room;
  }

  async findOneByPlatformAndCustomer(
    platformId: string,
    customerIdentityId: string,
  ): Promise<Room | null> {
    return this.roomRepository.findOne({
      where: { platforms_id: platformId, customer_identity_id: customerIdentityId },
      relations: ['platform', 'customer_identity'],
    });
  }

  async addMemberIfNotExists(
    roomId: string,
    userId: string,
    role: RoomMemberRole = RoomMemberRole.SECONDARY,
  ): Promise<RoomMember> {
    const existing = await this.roomMemberRepository.findOne({
      where: { room_id: roomId, user_id: userId },
    });
    if (existing) return existing;
    const member = this.roomMemberRepository.create({ room_id: roomId, user_id: userId, role });
    return this.roomMemberRepository.save(member);
  }

  async remove(id: string): Promise<void> {
    const room = await this.findOne(id);
    await this.roomRepository.remove(room);
  }

  async addMember(
    roomId: string,
    userId: string,
    role: RoomMemberRole = RoomMemberRole.SECONDARY,
  ): Promise<RoomMember> {
    await this.findOne(roomId);
    const existing = await this.roomMemberRepository.findOne({
      where: { room_id: roomId, user_id: userId },
    });
    if (existing) {
      throw new AppException(ErrorCode.RESOURCE_CONFLICT, 'User already in room', HttpStatus.CONFLICT);
    }
    const member = this.roomMemberRepository.create({ room_id: roomId, user_id: userId, role });
    return this.roomMemberRepository.save(member);
  }

  async removeMember(roomId: string, userId: string): Promise<void> {
    const member = await this.roomMemberRepository.findOne({
      where: { room_id: roomId, user_id: userId },
    });
    if (!member) {
      throw new AppException(ErrorCode.RESOURCE_NOT_FOUND, 'Room member not found', HttpStatus.NOT_FOUND);
    }
    await this.roomMemberRepository.remove(member);
  }

  async incrementUnread(roomId: string, messageText?: string, timestamp?: Date): Promise<void> {
    await this.roomRepository.increment({ room_id: roomId }, 'unread_count', 1);
    const update: Record<string, unknown> = { last_message_at: timestamp ?? new Date() };
    if (messageText !== undefined) {
      update.last_message_text = messageText.length > 100 ? messageText.substring(0, 100) + '...' : messageText;
    }
    await this.roomRepository.update(roomId, update);
  }

  async resetUnread(roomId: string): Promise<void> {
    await this.roomRepository.update(roomId, { unread_count: 0 });
  }

  async updateLastMessage(roomId: string, timestamp: Date, messageText?: string): Promise<void> {
    const update: Record<string, unknown> = { last_message_at: timestamp };
    if (messageText !== undefined) {
      update.last_message_text = messageText.length > 100 ? messageText.substring(0, 100) + '...' : messageText;
    }
    await this.roomRepository.update(roomId, update);
  }
}
