import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
} from "@nestjs/common";
import { ApiOkResponse, ApiTags, ApiUnauthorizedResponse } from "@nestjs/swagger";
import {
  authSessionSchema,
  loginRequestSchema,
  logoutResponseSchema,
  meResponseSchema,
} from "@cuidarte/contracts";
import { type FastifyReply, type FastifyRequest } from "fastify";

import { parseZodSchema } from "../../common/parse-zod-schema";
import { getEnv } from "../../config/env";
import { AuthService } from "./auth.service";
import { getSessionTokenFromRequest } from "./session-cookie";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  @HttpCode(200)
  @ApiOkResponse({ description: "Sesion iniciada correctamente." })
  @ApiUnauthorizedResponse({ description: "Credenciales invalidas." })
  async login(
    @Body() body: unknown,
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const command = parseZodSchema(loginRequestSchema, body);
    const session = await this.authService.login(command, {
      ip: request.ip ?? null,
      userAgent: this.getUserAgent(request),
    });

    reply.header("Set-Cookie", this.buildSessionCookie(session.token, session.expiresAt));

    return authSessionSchema.parse({
      user: session.user,
    });
  }

  @Get("me")
  @ApiOkResponse({ description: "Usuario autenticado actual." })
  async me(@Req() request: FastifyRequest) {
    const user = await this.authService.getCurrentUser(getSessionTokenFromRequest(request));

    return meResponseSchema.parse({ user });
  }

  @Post("logout")
  @HttpCode(200)
  @ApiOkResponse({ description: "Sesion cerrada correctamente." })
  async logout(
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    await this.authService.logout(getSessionTokenFromRequest(request));

    reply.header("Set-Cookie", this.buildExpiredSessionCookie());

    return logoutResponseSchema.parse({ success: true });
  }

  private getUserAgent(request: FastifyRequest): string | null {
    const userAgent = request.headers["user-agent"];

    if (Array.isArray(userAgent)) {
      return userAgent.join(", ");
    }

    return userAgent ?? null;
  }

  private buildSessionCookie(token: string, expiresAt: Date): string {
    const parts = [
      `${getEnv().SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
      "HttpOnly",
      "Path=/",
      "SameSite=Lax",
      `Expires=${expiresAt.toUTCString()}`,
    ];

    if (
      getEnv().NODE_ENV === "production" &&
      getEnv().WEB_ORIGIN.startsWith("https://")
    ) {
      parts.push("Secure");
    }

    return parts.join("; ");
  }

  private buildExpiredSessionCookie(): string {
    const parts = [
      `${getEnv().SESSION_COOKIE_NAME}=`,
      "HttpOnly",
      "Path=/",
      "SameSite=Lax",
      "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
      "Max-Age=0",
    ];

    if (
      getEnv().NODE_ENV === "production" &&
      getEnv().WEB_ORIGIN.startsWith("https://")
    ) {
      parts.push("Secure");
    }

    return parts.join("; ");
  }
}
