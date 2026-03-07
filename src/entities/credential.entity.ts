import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Platform } from './platform.entity';

@Entity('credential')
export class Credential {
  @PrimaryGeneratedColumn('uuid')
  credential_id: string;

  @Column({ type: 'uuid' })
  platforms_id: string;

  @Column({ name: 'api_key', type: 'varchar', length: 500, nullable: true })
  api_key: string | null;

  @Column({ name: 'access_token', type: 'text', nullable: true })
  access_token: string | null;

  @Column({ name: 'secret', type: 'text', nullable: true })
  secret: string | null;

  @Column({ name: 'verify_token', type: 'varchar', length: 255, nullable: true })
  verify_token: string | null;

  @Column({ name: 'refresh_token', type: 'text', nullable: true })
  refresh_token: string | null;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expires_at: Date | null;

  @Column({ type: 'uuid', nullable: true })
  create_by: string | null;

  @CreateDateColumn({ name: 'create_at' })
  create_at: Date;

  @Column({ type: 'uuid', nullable: true })
  update_by: string | null;

  @UpdateDateColumn({ name: 'update_at' })
  update_at: Date;

  @ManyToOne(() => Platform, (platform) => platform.credentials, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'platforms_id' })
  platform: Platform;
}
