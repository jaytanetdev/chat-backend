import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, ValidateNested, Allow } from 'class-validator';
import { Type } from 'class-transformer';

class WebhookSourceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  type?: string;
}

class WebhookEventDto {
  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => WebhookSourceDto)
  source?: WebhookSourceDto;

  @ApiPropertyOptional()
  @IsOptional()
  @Allow()
  message?: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  replyToken?: string;

  @ApiPropertyOptional()
  @IsOptional()
  timestamp?: number;
}

export class InboundWebhookDto {
  @ApiProperty({ description: 'e.g. LINE destination (external_account_id)' })
  @IsString()
  destination: string;

  @ApiPropertyOptional({ type: [WebhookEventDto], description: 'LINE-style events array' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WebhookEventDto)
  events?: WebhookEventDto[];
}
