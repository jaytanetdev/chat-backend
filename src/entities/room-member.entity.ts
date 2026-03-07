import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Room } from './room.entity';
import { User } from './user.entity';

export enum RoomMemberRole {
  PRIMARY = 'PRIMARY',
  SECONDARY = 'SECONDARY',
  OBSERVER = 'OBSERVER',
}

@Entity('room_members')
@Unique('UQ_room_members_room_user', ['room_id', 'user_id'])
export class RoomMember {
  @PrimaryGeneratedColumn('uuid')
  room_members_id: string;

  @Column({ type: 'uuid' })
  room_id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({
    name: 'role',
    type: 'enum',
    enum: RoomMemberRole,
    default: RoomMemberRole.SECONDARY,
  })
  role: RoomMemberRole;

  @CreateDateColumn({ name: 'joined_at' })
  joined_at: Date;

  @ManyToOne(() => Room, (room) => room.room_members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'room_id' })
  room: Room;

  @ManyToOne(() => User, (user) => user.room_members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
