import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { RoomMember } from './room-member.entity';
import { UserPlatform } from './user-platform.entity';

export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  user_id: string;

  @Column({ type: 'enum', enum: UserRole })
  role: UserRole;

  @Column({ type: 'varchar', length: 255, nullable: true })
  username: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, select: false })
  password: string | null;

  @Column({ type: 'uuid', nullable: true })
  create_by: string | null;

  @CreateDateColumn({ name: 'create_at' })
  create_at: Date;

  @Column({ type: 'uuid', nullable: true })
  update_by: string | null;

  @UpdateDateColumn({ name: 'update_at' })
  update_at: Date;

  @OneToMany(() => RoomMember, (rm) => rm.user)
  room_members: RoomMember[];

  @OneToMany(() => UserPlatform, (up) => up.user)
  user_platforms: UserPlatform[];
}
