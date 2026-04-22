import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { type MaybeAuthenticatedRequest } from "./authenticated-request";
import { REQUIRED_ROLES_KEY } from "./roles.decorator";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles =
      this.reflector.getAllAndOverride<readonly string[]>(REQUIRED_ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    if (requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<MaybeAuthenticatedRequest>();

    if (request.currentUser === undefined) {
      throw new UnauthorizedException("Sesion requerida.");
    }

    if (!requiredRoles.includes(request.currentUser.role)) {
      throw new ForbiddenException("No tienes permisos para acceder a este recurso.");
    }

    return true;
  }
}
