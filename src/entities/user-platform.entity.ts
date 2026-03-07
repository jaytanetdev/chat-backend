import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { User } from './user.entity';
import { Platform } from './platform.entity';

@Entity('user_platforms')
@Unique('UQ_user_platforms_user_platform', ['user_id', 'platforms_id'])
export class UserPlatform {
  @PrimaryGeneratedColumn('uuid', { name: 'user_platform_id' })
  user_platform_id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  user_id: string;

  @Column({ type: 'uuid', name: 'platforms_id' })
  platforms_id: string;

  @ManyToOne(() => User, (user) => user.user_platforms, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Platform, (platform) => platform.user_platforms, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'platforms_id' })
  platform: Platform;
}
