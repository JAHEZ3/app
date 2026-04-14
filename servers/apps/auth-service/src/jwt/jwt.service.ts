import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
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

interface RefreshTokenRecord {
  token: string;
  deviceInfo?: Record<string, any>;
}

const RT_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

@Injectable()
export class AppJwtService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  private get accessSecret(): string {
    return this.configService.get<string>('JWT_ACCESS_SECRET', 'access-secret-change-in-prod');
  }

  private get refreshSecret(): string {
    return this.configService.get<string>('JWT_REFRESH_SECRET', 'refresh-secret-change-in-prod');
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
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }

  // ─── Refresh Token ────────────────────────────────────────────────────────────

  async signRefreshToken(payload: Omit<JwtPayload, 'jti'>, deviceInfo?: Record<string, any>): Promise<string> {
    const jti = randomUUID();

    const token = this.jwtService.sign(
      { ...payload, jti },
      { secret: this.refreshSecret, expiresIn: '30d' },
    );

    // Store only token + optional device info — payload is recoverable from the JWT itself
    const record: RefreshTokenRecord = { token, ...(deviceInfo && { deviceInfo }) };
    await this.cache.set(this.rtKey(jti), record, RT_TTL_MS);

    // Track this jti under the user so we can revoke all at once
    const existing = await this.cache.get<string[]>(this.userTokensKey(payload.sub)) ?? [];
    await this.cache.set(this.userTokensKey(payload.sub), [...existing, jti], RT_TTL_MS);

    return token;
  }

  async verifyRefreshToken(token: string): Promise<JwtPayload> {
    let decoded: JwtPayload;
    try {
      decoded = this.jwtService.verify<JwtPayload>(token, { secret: this.refreshSecret });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const record = await this.cache.get<RefreshTokenRecord>(this.rtKey(decoded.jti));
    if (!record) {
      throw new UnauthorizedException('Refresh token revoked or not found');
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

    // Remove jti from user's token list
    const tokens = await this.cache.get<string[]>(this.userTokensKey(decoded.sub)) ?? [];
    const updated = tokens.filter((jti) => jti !== decoded.jti);
    if (updated.length > 0) {
      await this.cache.set(this.userTokensKey(decoded.sub), updated, RT_TTL_MS);
    } else {
      await this.cache.del(this.userTokensKey(decoded.sub));
    }
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    const tokens = await this.cache.get<string[]>(this.userTokensKey(userId)) ?? [];
    await Promise.all(tokens.map((jti) => this.cache.del(this.rtKey(jti))));
    await this.cache.del(this.userTokensKey(userId));
  }
}
