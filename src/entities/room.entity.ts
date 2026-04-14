import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { Platform } from './platform.entity';
import { CustomerIdentity } from './customer-identity.entity';
import { User } from './user.entity';
import { RoomMember } from './room-member.entity';
import { Chat } from './chat.entity';

export enum RoomStatus {
  ACTIVE = 'ACTIVE',
  PENDING = 'PENDING',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

@Entity('room')
@Unique('room_customer_platform_unique', ['customer_identity_id', 'platforms_id'])
export class Room {
  @PrimaryGeneratedColumn('uuid')
  room_id: string;

  @Column({ type: 'uuid' })
  platforms_id: string;

  @Column({ type: 'uuid', nullable: true })
  customer_identity_id: string | null;

  @Index()
  @Column({ name: 'assigned_user_id', type: 'uuid', nullable: true })
  assigned_user_id: string | null;

  @Column({ name: 'unread_count', type: 'int', default: 0 })
  unread_count: number;

  @Column({ name: 'last_message_at', type: 'timestamptz', nullable: true })
  last_message_at: Date | null;

  @Column({ name: 'last_message_text', type: 'varchar', length: 255, nullable: true })
  last_message_text: string | null;

  @Column({
    name: 'status',
    type: 'enum',
    enum: RoomStatus,
    default: RoomStatus.ACTIVE,
  })
  status: RoomStatus;

  @CreateDateColumn({ name: 'create_at' })
  create_at: Date;

  @UpdateDateColumn({ name: 'update_at' })
  update_at: Date;

  @ManyToOne(() => Platform, (platform) => platform.rooms, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'platforms_id' })
  platform: Platform;

  @ManyToOne(() => CustomerIdentity, (ci) => ci.rooms, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'customer_identity_id' })
  customer_identity: CustomerIdentity | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'assigned_user_id' })
  assigned_user: User | null;

  @OneToMany(() => RoomMember, (rm) => rm.room)
  room_members: RoomMember[];

  @OneToMany(() => Chat, (chat) => chat.room)
  chats: Chat[];
}
