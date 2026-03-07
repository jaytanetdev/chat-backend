import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional, IsUUID, IsEnum, MaxLength } from 'class-validator';
import { PlatformType } from '../../../entities';

export class CreatePlatformDto {
  @ApiProperty({ enum: PlatformType, description: 'LINE | FACEBOOK | INSTAGRAM | SHOPEE | LAZADA' })
  @IsEnum(PlatformType)
  platform_type: PlatformType;

  @ApiProperty({ description: 'External account id e.g. LINE destination', maxLength: 255 })
  @IsString()
  @MaxLength(255)
  external_account_id: string;

  @ApiPropertyOptional({ description: 'Display name for the platform connection', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  platform_name?: string;

  @ApiProperty()
  @IsUUID()
  shop_id: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
