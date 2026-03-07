import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID, Min, Max, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class ChatQueryDto {
  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Cursor (chat_id) for pagination' })
  @IsOptional()
  @IsUUID()
  cursor?: string;
}
