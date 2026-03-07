import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsUUID, IsNotEmpty, IsOptional, IsEnum, IsBoolean, IsObject, MaxLength } from 'class-validator';
import { ChatDirection, ChatSenderType, ChatMessageType } from '../../../entities';

export class CreateChatDto {
  @ApiProperty()
  @IsUUID()
  room_id: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({ enum: ChatSenderType, description: 'customer | admin | system; set when e.g. webhook sends as customer' })
  @IsOptional()
  @IsEnum(ChatSenderType)
  sender_type?: ChatSenderType;

  @ApiPropertyOptional({ description: 'customer_identity_id (customer) or user_id (admin)' })
  @IsOptional()
  @IsUUID()
  sender_id?: string;

  @ApiPropertyOptional({ enum: ChatDirection, description: 'IN = from customer, OUT = from admin' })
  @IsOptional()
  @IsEnum(ChatDirection)
  direction?: ChatDirection;

  @ApiPropertyOptional({ description: 'LINE message.id for dedup on webhook retry', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  external_message_id?: string;

  @ApiPropertyOptional({ enum: ChatMessageType })
  @IsOptional()
  @IsEnum(ChatMessageType)
  message_type?: ChatMessageType;

  @ApiPropertyOptional({ description: 'Extra data: image URL, file URL, sticker ID, etc.' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  is_read?: boolean;
}
