import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../../entities';
import { AppException, ErrorCode } from '../../../common/errors';
import { PUBLIC_KEY } from '../decorators/public.decorator';

export const ROLES_KEY = 'roles';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles?.length) return true;
    const { user } = context.switchToHttp().getRequest();
    const hasRole = requiredRoles.some((role) => user?.role === role);
    if (!hasRole) {
      throw new AppException(ErrorCode.AUTH_FORBIDDEN, 'Insufficient role', HttpStatus.FORBIDDEN);
    }
    return true;
  }
}
