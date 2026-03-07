import { ApiProperty } from '@nestjs/swagger';

export class ChatListResponseDto<T> {
  @ApiProperty({ isArray: true })
  items: T[];

  @ApiProperty({ nullable: true, description: 'Next cursor for infinite scroll' })
  next_cursor: string | null;

  @ApiProperty()
  hasMore: boolean;
}
