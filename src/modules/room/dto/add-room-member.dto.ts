import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsOptional, IsEnum } from 'class-validator';
import { RoomMemberRole } from '../../../entities';

export class AddRoomMemberDto {
  @ApiProperty()
  @IsUUID()
  user_id: string;

  @ApiPropertyOptional({ enum: RoomMemberRole, default: RoomMemberRole.SECONDARY })
  @IsOptional()
  @IsEnum(RoomMemberRole)
  role?: RoomMemberRole;
}
