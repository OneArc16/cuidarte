import { randomBytes, createHash } from "node:crypto";

import {
  type AuthUser,
  authUserSchema,
  type LoginRequest,
  type UserPermission,
} from "@cuidarte/contracts";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { and, eq, gt, isNull } from "drizzle-orm";
import { verify } from "argon2";

import { getEnv } from "../../config/env";
import { DatabaseService } from "../../database/database.service";
import { tenants, userPermissions, userSessions, users } from "../../database/schema";

type LoginMetadata = {
  ip: string | null;
  userAgent: string | null;
};

type AuthenticatedSession = {
  token: string;
  expiresAt: Date;
  user: AuthUser;
};

type UserRow = typeof users.$inferSelect;
type TenantRow = typeof tenants.$inferSelect;

const GENERIC_LOGIN_ERROR = "Correo o contrasena incorrectos.";
const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

@Injectable()
export class AuthService {
  constructor(private readonly database: DatabaseService) {}

  async login(command: LoginRequest, metadata: LoginMetadata): Promise<AuthenticatedSession> {
    const user = await this.findUserByEmail(command.email);

    if (user === null || !user.isActive || this.isLocked(user)) {
      throw new UnauthorizedException(GENERIC_LOGIN_ERROR);
    }

    const tenant = await this.ensureTenantCanLogin(user);

    const passwordMatches = await verify(user.passwordHash, command.password);

    if (!passwordMatches) {
      await this.registerFailedLogin(user);
      throw new UnauthorizedException(GENERIC_LOGIN_ERROR);
    }

    const now = new Date();
    const token = randomBytes(32).toString("base64url");
    const tokenHash = this.hashToken(token);
    const expiresAt = this.resolveSessionExpiration(now);

    await this.database.db.insert(userSessions).values({
      userId: user.id,
      tokenHash,
      expiresAt,
      createdIp: metadata.ip,
      createdUserAgent: metadata.userAgent,
      lastUsedAt: now,
    });

    await this.database.db
      .update(users)
      .set({
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: now,
        updatedAt: now,
      })
      .where(eq(users.id, user.id));

    const permissions = await this.findUserPermissions(user.id);

    return {
      token,
      expiresAt,
      user: this.toAuthUser(user, tenant, permissions),
    };
  }

  async getCurrentUser(token: string | undefined): Promise<AuthUser | null> {
    if (token === undefined || token.length === 0) {
      return null;
    }

    const now = new Date();
    const tokenHash = this.hashToken(token);

    const [session] = await this.database.db
      .select()
      .from(userSessions)
      .where(
        and(
          eq(userSessions.tokenHash, tokenHash),
          isNull(userSessions.revokedAt),
          gt(userSessions.expiresAt, now),
        ),
      )
      .limit(1);

    if (session === undefined) {
      return null;
    }

    const user = await this.findUserById(session.userId);

    if (user === null || !user.isActive || this.isLocked(user)) {
      return null;
    }

    const tenant = await this.ensureTenantCanLogin(user);

    await this.database.db
      .update(userSessions)
      .set({ lastUsedAt: now })
      .where(eq(userSessions.id, session.id));

    const permissions = await this.findUserPermissions(user.id);

    return this.toAuthUser(user, tenant, permissions);
  }

  async logout(token: string | undefined): Promise<void> {
    if (token === undefined || token.length === 0) {
      return;
    }

    await this.database.db
      .update(userSessions)
      .set({ revokedAt: new Date() })
      .where(eq(userSessions.tokenHash, this.hashToken(token)));
  }

  private async findUserByEmail(email: string): Promise<UserRow | null> {
    const [user] = await this.database.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    return user ?? null;
  }

  private async findUserById(id: string): Promise<UserRow | null> {
    const [user] = await this.database.db.select().from(users).where(eq(users.id, id)).limit(1);

    return user ?? null;
  }

  private async ensureTenantCanLogin(user: UserRow): Promise<TenantRow | null> {
    if (user.tenantId === null) {
      return null;
    }

    const [tenant] = await this.database.db
      .select()
      .from(tenants)
      .where(eq(tenants.id, user.tenantId))
      .limit(1);

    if (tenant === undefined || !tenant.isActive) {
      throw new UnauthorizedException(GENERIC_LOGIN_ERROR);
    }

    return tenant;
  }

  private isLocked(user: UserRow): boolean {
    return user.lockedUntil !== null && user.lockedUntil > new Date();
  }

  private async registerFailedLogin(user: UserRow): Promise<void> {
    const failedLoginAttempts = user.failedLoginAttempts + 1;
    const lockedUntil =
      failedLoginAttempts >= MAX_FAILED_LOGIN_ATTEMPTS
        ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000)
        : null;

    await this.database.db
      .update(users)
      .set({
        failedLoginAttempts,
        lockedUntil,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));
  }

  private resolveSessionExpiration(now: Date): Date {
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + getEnv().SESSION_TTL_DAYS);

    return expiresAt;
  }

  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  private async findUserPermissions(userId: string): Promise<UserPermission[]> {
    const rows = await this.database.db
      .select({ permission: userPermissions.permission })
      .from(userPermissions)
      .where(eq(userPermissions.userId, userId));

    return rows.map((row) => row.permission as UserPermission);
  }

  private toAuthUser(
    user: UserRow,
    tenant: TenantRow | null,
    permissions: UserPermission[],
  ): AuthUser {
    return authUserSchema.parse({
      id: user.id,
      tenantId: user.tenantId,
      tenantMunicipality: tenant?.city ?? null,
      tenantDepartment: tenant?.department ?? null,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      passwordSetByAdmin: user.passwordSetByAdmin,
      permissions,
    });
  }
}
