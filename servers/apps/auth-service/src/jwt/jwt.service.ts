import { Inject, Injectable, NotFoundException, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { randomUUID } from 'crypto';

export interface JwtPayload {
  sub: string;
  jti: string;
  role: string;
  phone?: string;
  email?: string;
  /** true once the user has completed their profile (customer activated / delivery-restaurant submitted request). */
  profileCompleted?: boolean;
}

export interface SessionContext {
  ip?: string;
  userAgent?: string;
  deviceInfo?: Record<string, any>;
}

interface RefreshTokenRecord {
  token: string;
  userId: string;
  createdAt: number;
  lastUsedAt: number;
  ip?: string;
  userAgent?: string;
  deviceInfo?: Record<string, any>;
}

export interface SessionSummary {
  id: string;
  createdAt: number;
  lastUsedAt: number;
  ip?: string;
  userAgent?: string;
  deviceInfo?: Record<string, any>;
}

const RT_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

@Injectable()
export class AppJwtService implements OnModuleInit {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  onModuleInit() {
    const accessSecret = this.configService.get<string>('JWT_ACCESS_SECRET');
    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');
    if (!accessSecret || !refreshSecret) {
      throw new Error(
        'FATAL: JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be set in environment variables. Refusing to start.',
      );
    }
  }

  private get accessSecret(): string {
    return this.configService.get<string>('JWT_ACCESS_SECRET')!;
  }

  private get refreshSecret(): string {
    return this.configService.get<string>('JWT_REFRESH_SECRET')!;
  }

  private rtKey(jti: string): string {
    return `rt:${jti}`;
  }

  private userTokensKey(userId: string): string {
    return `user_tokens:${userId}`;
  }

  // ─── Access Token ─────────────────────────────────────────────────────────────

  signAccessToken(payload: Omit<JwtPayload, 'jti'>): string {
    return this.jwtService.sign(payload, {
      secret: this.accessSecret,
      expiresIn: '30m',
    });
  }

  verifyAccessToken(token: string): JwtPayload {
    try {
      return this.jwtService.verify<JwtPayload>(token, { secret: this.accessSecret });
    } catch {
      throw new UnauthorizedException('رمز الوصول غير صالح أو منتهي الصلاحية.');
    }
  }

  // ─── Refresh Token ────────────────────────────────────────────────────────────

  async signRefreshToken(
    payload: Omit<JwtPayload, 'jti'>,
    context?: SessionContext,
  ): Promise<string> {
    const jti = randomUUID();
    const now = Date.now();

    const token = this.jwtService.sign(
      { ...payload, jti },
      { secret: this.refreshSecret, expiresIn: '30d' },
    );

    const record: RefreshTokenRecord = {
      token,
      userId: payload.sub,
      createdAt: now,
      lastUsedAt: now,
      ...(context?.ip && { ip: context.ip }),
      ...(context?.userAgent && { userAgent: context.userAgent }),
      ...(context?.deviceInfo && { deviceInfo: context.deviceInfo }),
    };
    await this.cache.set(this.rtKey(jti), record, RT_TTL_MS);

    // Track this jti under the user so we can revoke all at once or list sessions
    const existing = (await this.cache.get<string[]>(this.userTokensKey(payload.sub))) ?? [];
    await this.cache.set(this.userTokensKey(payload.sub), [...existing, jti], RT_TTL_MS);

    return token;
  }

  async verifyRefreshToken(token: string): Promise<JwtPayload> {
    let decoded: JwtPayload;
    try {
      decoded = this.jwtService.verify<JwtPayload>(token, { secret: this.refreshSecret });
    } catch {
      throw new UnauthorizedException('رمز التحديث غير صالح أو منتهي الصلاحية.');
    }

    const record = await this.cache.get<RefreshTokenRecord>(this.rtKey(decoded.jti));
    if (!record) {
      throw new UnauthorizedException('رمز التحديث ملغى أو غير موجود.');
    }

    // Best-effort lastUsedAt refresh
    try {
      await this.cache.set(
        this.rtKey(decoded.jti),
        { ...record, lastUsedAt: Date.now() },
        RT_TTL_MS,
      );
    } catch {
      // ignore — not critical for auth correctness
    }

    return decoded;
  }

  async revokeRefreshToken(token: string): Promise<void> {
    let decoded: JwtPayload;
    try {
      decoded = this.jwtService.verify<JwtPayload>(token, { secret: this.refreshSecret });
    } catch {
      return;
    }

    await this.cache.del(this.rtKey(decoded.jti));
    await this.removeJtiFromUserList(decoded.sub, decoded.jti);
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    const tokens = (await this.cache.get<string[]>(this.userTokensKey(userId))) ?? [];
    await Promise.all(tokens.map((jti) => this.cache.del(this.rtKey(jti))));
    await this.cache.del(this.userTokensKey(userId));
  }

  // ─── Sessions ─────────────────────────────────────────────────────────────────

  async listSessions(userId: string): Promise<SessionSummary[]> {
    const jtis = (await this.cache.get<string[]>(this.userTokensKey(userId))) ?? [];
    const records = await Promise.all(
      jtis.map((jti) => this.cache.get<RefreshTokenRecord>(this.rtKey(jti))),
    );

    const alive: { jti: string; rec: RefreshTokenRecord }[] = [];
    const expired: string[] = [];
    jtis.forEach((jti, i) => {
      const rec = records[i];
      if (rec) alive.push({ jti, rec });
      else expired.push(jti);
    });

    // Best-effort cleanup of expired jtis from user list
    if (expired.length > 0) {
      const remaining = alive.map((a) => a.jti);
      if (remaining.length > 0) {
        await this.cache.set(this.userTokensKey(userId), remaining, RT_TTL_MS);
      } else {
        await this.cache.del(this.userTokensKey(userId));
      }
    }

    return alive
      .map(({ jti, rec }) => ({
        id: jti,
        createdAt: rec.createdAt,
        lastUsedAt: rec.lastUsedAt,
        ...(rec.ip && { ip: rec.ip }),
        ...(rec.userAgent && { userAgent: rec.userAgent }),
        ...(rec.deviceInfo && { deviceInfo: rec.deviceInfo }),
      }))
      .sort((a, b) => b.lastUsedAt - a.lastUsedAt);
  }

  /** Resolve a refresh token to its jti without throwing if it's already revoked. */
  decodeJtiFromRefreshToken(token: string): string | null {
    try {
      const decoded = this.jwtService.verify<JwtPayload>(token, { secret: this.refreshSecret });
      return decoded.jti ?? null;
    } catch {
      return null;
    }
  }

  async revokeSessionByJti(userId: string, jti: string): Promise<void> {
    const record = await this.cache.get<RefreshTokenRecord>(this.rtKey(jti));
    if (!record || record.userId !== userId) {
      throw new NotFoundException('الجلسة غير موجودة.');
    }
    await this.cache.del(this.rtKey(jti));
    await this.removeJtiFromUserList(userId, jti);
  }

  async revokeAllUserSessionsExcept(userId: string, keepJti: string): Promise<number> {
    const jtis = (await this.cache.get<string[]>(this.userTokensKey(userId))) ?? [];
    const toRevoke = jtis.filter((jti) => jti !== keepJti);
    await Promise.all(toRevoke.map((jti) => this.cache.del(this.rtKey(jti))));

    const remaining = jtis.includes(keepJti) ? [keepJti] : [];
    if (remaining.length > 0) {
      await this.cache.set(this.userTokensKey(userId), remaining, RT_TTL_MS);
    } else {
      await this.cache.del(this.userTokensKey(userId));
    }
    return toRevoke.length;
  }

  private async removeJtiFromUserList(userId: string, jti: string): Promise<void> {
    const tokens = (await this.cache.get<string[]>(this.userTokensKey(userId))) ?? [];
    const updated = tokens.filter((t) => t !== jti);
    if (updated.length > 0) {
      await this.cache.set(this.userTokensKey(userId), updated, RT_TTL_MS);
    } else {
      await this.cache.del(this.userTokensKey(userId));
    }
  }
}
