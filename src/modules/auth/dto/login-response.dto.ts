import { ApiProperty } from '@nestjs/swagger';

export class LoginResponseDto {
  @ApiProperty()
  access_token: string;

  @ApiProperty()
  user_id: string;

  @ApiProperty({ enum: ['USER', 'ADMIN'] })
  role: string;

  @ApiProperty({ nullable: true })
  username: string | null;
}
