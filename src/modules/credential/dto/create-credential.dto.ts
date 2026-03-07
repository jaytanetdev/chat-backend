import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsUUID, IsOptional, MaxLength, IsDateString } from 'class-validator';

export class CreateCredentialDto {
  @ApiProperty()
  @IsUUID()
  platforms_id: string;

  @ApiPropertyOptional({ description: 'API key (legacy)', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  api_key?: string;

  @ApiPropertyOptional({ description: 'LINE channel access token' })
  @IsOptional()
  @IsString()
  access_token?: string;

  @ApiPropertyOptional({ description: 'LINE channel secret' })
  @IsOptional()
  @IsString()
  secret?: string;

  @ApiPropertyOptional({ description: 'FB/IG webhook verify token', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  verify_token?: string;

  @ApiPropertyOptional({ description: 'Refresh token' })
  @IsOptional()
  @IsString()
  refresh_token?: string;

  @ApiPropertyOptional({ description: 'Token expiry (ISO date)' })
  @IsOptional()
  @IsDateString()
  expires_at?: string;
}
