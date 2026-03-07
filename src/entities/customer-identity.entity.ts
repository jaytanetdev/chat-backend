import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Platform } from './platform.entity';
import { Room } from './room.entity';

@Entity('customer_identities')
@Unique('UQ_customer_identities_platform_external', [
  'platform_id',
  'external_user_id',
])
export class CustomerIdentity {
  @PrimaryGeneratedColumn('uuid')
  customer_identity_id: string;

  @Column({ type: 'uuid' })
  platform_id: string;

  @Column({ name: 'external_user_id', type: 'varchar', length: 255 })
  external_user_id: string;

  @Column({ name: 'display_name', type: 'varchar', length: 255, nullable: true })
  display_name: string | null;

  @Column({ name: 'avatar_url', type: 'text', nullable: true })
  avatar_url: string | null;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;

  @ManyToOne(() => Platform, (platform) => platform.customer_identities, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'platform_id' })
  platform: Platform;

  @OneToMany(() => Room, (room) => room.customer_identity)
  rooms: Room[];
}
