import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

@Entity('quick_reply')
@Index(['user_id', 'sort_order'])
export class QuickReply {
  @PrimaryGeneratedColumn('uuid')
  quick_reply_id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'varchar', length: 50 })
  label: string;

  @Column({ type: 'text' })
  text: string;

  @Column({ type: 'int', default: 0 })
  sort_order: number;

  @CreateDateColumn({ name: 'create_at' })
  create_at: Date;

  @UpdateDateColumn({ name: 'update_at' })
  update_at: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
