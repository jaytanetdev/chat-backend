import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { UserRole } from '../../../entities';

export class CreateUserDto {
  @ApiProperty({ enum: UserRole })
  @IsEnum(UserRole)
  role: UserRole;

  @ApiPropertyOptional({ description: 'Required for ADMIN' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  username?: string | null;

  @ApiPropertyOptional({ description: 'Required for ADMIN, min 6 chars', minLength: 6 })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  create_by?: string | null;
}
