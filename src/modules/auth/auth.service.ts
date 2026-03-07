import { Injectable, HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../../entities';
import { AppException, ErrorCode } from '../../common/errors';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(username: string, password: string): Promise<User | null> {
    const user = await this.userRepository.findOne({
      where: { username, role: UserRole.ADMIN },
      select: ['user_id', 'username', 'password', 'role'],
    });
    if (!user?.password) return null;
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return null;
    return user;
  }

  async login(username: string, password: string) {
    const user = await this.validateUser(username, password);
    if (!user) {
      throw new AppException(
        ErrorCode.AUTH_INVALID_CREDENTIALS,
        'Invalid username or password',
        HttpStatus.UNAUTHORIZED,
      );
    }
    const payload = { sub: user.user_id, username: user.username, role: user.role };
    const access_token = this.jwtService.sign(payload);
    return {
      access_token,
      user_id: user.user_id,
      role: user.role,
      username: user.username,
    };
  }
}
