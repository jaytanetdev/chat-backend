import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Chat } from './chat.entity';
import { User } from './user.entity';

@Entity('chat_read_receipts')
@Unique('UQ_chat_read_receipts_chat_user', ['chat_id', 'user_id'])
export class ChatReadReceipt {
  @PrimaryGeneratedColumn('uuid')
  chat_read_receipt_id: string;

  @Column({ type: 'uuid' })
  chat_id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @CreateDateColumn({ name: 'read_at' })
  read_at: Date;

  @ManyToOne(() => Chat, (chat) => chat.read_receipts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'chat_id' })
  chat: Chat;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
