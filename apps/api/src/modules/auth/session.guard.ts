import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";

import { type MaybeAuthenticatedRequest } from "./authenticated-request";
import { AuthService } from "./auth.service";
import { getSessionTokenFromRequest } from "./session-cookie";

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<MaybeAuthenticatedRequest>();
    const user = await this.authService.getCurrentUser(getSessionTokenFromRequest(request));

    if (user === null) {
      throw new UnauthorizedException("Sesion requerida.");
    }

    request.currentUser = user;

    return true;
  }
}
