import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, IsOptional, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ description: 'User ID to reset password for', required: false })
  @IsOptional()
  @IsUUID()
  user_id?: string;

  @ApiProperty({ description: 'Username to reset password for', required: false })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiProperty({ description: 'New password', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;
}
