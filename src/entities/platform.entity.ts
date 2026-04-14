import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Shop } from './shop.entity';
import { Credential } from './credential.entity';
import { Room } from './room.entity';
import { CustomerIdentity } from './customer-identity.entity';
import { UserPlatform } from './user-platform.entity';

export enum PlatformType {
  LINE = 'LINE',
  FACEBOOK = 'FACEBOOK',
  INSTAGRAM = 'INSTAGRAM',
  SHOPEE = 'SHOPEE',
  LAZADA = 'LAZADA',
  TIKTOK = 'TIKTOK',
}

@Entity('platforms')
export class Platform {
  @PrimaryGeneratedColumn('uuid')
  platforms_id: string;

  @Column({
    name: 'platform_type',
    type: 'enum',
    enum: PlatformType,
  })
  platform_type: PlatformType;

  @Column({ name: 'external_account_id', type: 'varchar', length: 255, nullable: true })
  external_account_id: string | null;

  @Column({ name: 'platform_name', type: 'varchar', length: 255, nullable: true })
  platform_name: string | null;

  @Column({ type: 'uuid' })
  shop_id: string;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'uuid', nullable: true })
  create_by: string | null;

  @CreateDateColumn({ name: 'create_at' })
  create_at: Date;

  @Column({ type: 'uuid', nullable: true })
  update_by: string | null;

  @UpdateDateColumn({ name: 'update_at' })
  update_at: Date;

  @ManyToOne(() => Shop, (shop) => shop.platforms, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shop_id' })
  shop: Shop;

  @OneToMany(() => Credential, (credential) => credential.platform)
  credentials: Credential[];

  @OneToMany(() => Room, (room) => room.platform)
  rooms: Room[];

  @OneToMany(() => CustomerIdentity, (ci) => ci.platform)
  customer_identities: CustomerIdentity[];

  @OneToMany(() => UserPlatform, (up) => up.platform)
  user_platforms: UserPlatform[];
}
