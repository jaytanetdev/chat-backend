import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsUUID, IsOptional, MaxLength } from 'class-validator';

export class CreateCustomerIdentityDto {
  @ApiProperty({ description: 'Platform (OA) this customer belongs to' })
  @IsUUID()
  platform_id: string;

  @ApiProperty({ description: 'External user id e.g. LINE source.userId', maxLength: 255 })
  @IsString()
  @MaxLength(255)
  external_user_id: string;

  @ApiPropertyOptional({ description: 'Customer display name from platform', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  display_name?: string;

  @ApiPropertyOptional({ description: 'Customer avatar/profile image URL' })
  @IsOptional()
  @IsString()
  avatar_url?: string;
}
