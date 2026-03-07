import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Platform } from './platform.entity';

@Entity('shop')
export class Shop {
  @PrimaryGeneratedColumn('uuid')
  shop_id: string;

  @Column({ type: 'varchar', length: 255 })
  shop_name: string;

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

  @OneToMany(() => Platform, (platform) => platform.shop)
  platforms: Platform[];
}
