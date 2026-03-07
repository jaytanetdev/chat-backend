import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class WebhookSourceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userId?: string;
}

class WebhookMessageDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  text?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  type?: string;
}

class WebhookEventDto {
  @ApiPropertyOptional({ type: WebhookSourceDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => WebhookSourceDto)
  source?: WebhookSourceDto;

  @ApiPropertyOptional({ type: WebhookMessageDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => WebhookMessageDto)
  message?: WebhookMessageDto | string;
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
