import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AssignUserPlatformDto {
  @ApiProperty()
  @IsUUID()
  user_id: string;

  @ApiProperty()
  @IsUUID()
  platforms_id: string;
}
