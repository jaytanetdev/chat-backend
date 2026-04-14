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
import { Room } from './room.entity';
import { ChatReadReceipt } from './chat-read-receipt.entity';

export enum ChatDirection {
  IN = 'IN',
  OUT = 'OUT',
}

/** Polymorphic sender: customer_identity_id (customer) | user_id (admin) | null (system) */
export enum ChatSenderType {
  CUSTOMER = 'CUSTOMER',
  ADMIN = 'ADMIN',
  SYSTEM = 'SYSTEM',
}

export enum ChatMessageType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  AUDIO = 'AUDIO',
  FILE = 'FILE',
  STICKER = 'STICKER',
}

@Entity('chat')
@Unique('UQ_chat_room_external_message', ['room_id', 'external_message_id'])
export class Chat {
  @PrimaryGeneratedColumn('uuid')
  chat_id: string;

  @Column({ type: 'uuid' })
  room_id: string;

  @Column({
    name: 'sender_type',
    type: 'enum',
    enum: ChatSenderType,
    default: ChatSenderType.CUSTOMER,
  })
  sender_type: ChatSenderType;

  @Column({ name: 'sender_id', type: 'uuid', nullable: true })
  sender_id: string | null;

  @Column({ type: 'enum', enum: ChatDirection })
  direction: ChatDirection;

  @Column({ name: 'external_message_id', type: 'varchar', length: 255, nullable: true })
  external_message_id: string | null;

  @Column({ type: 'text' })
  message: string;

  @Column({ name: 'message_type', type: 'varchar', length: 50, default: 'TEXT' })
  message_type: ChatMessageType;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @Column({ name: 'is_read', type: 'boolean', default: false })
  is_read: boolean;

  @CreateDateColumn({ name: 'create_at' })
  create_at: Date;

  @ManyToOne(() => Room, (room) => room.chats, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'room_id' })
  room: Room;

  @OneToMany(() => ChatReadReceipt, (rr) => rr.chat)
  read_receipts: ChatReadReceipt[];
}
