import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { RoomStatus } from '../../../entities';

export class CreateRoomDto {
  @ApiProperty()
  @IsUUID()
  platforms_id: string;

  @ApiProperty({ description: 'Customer identity (1 room per customer per OA)' })
  @IsUUID()
  customer_identity_id: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assigned_user_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  last_message_at?: string;

  @ApiPropertyOptional({ enum: RoomStatus, default: RoomStatus.ACTIVE })
  @IsOptional()
  @IsEnum(RoomStatus)
  status?: RoomStatus;
}
