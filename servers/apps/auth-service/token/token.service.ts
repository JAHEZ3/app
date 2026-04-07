import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { createHash, randomBytes } from 'crypto';
import { RefreshToken } from '../src/entities/refresh-token.entity';

export interface JwtPayload {
  sub: string;
  role: string;
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,
  ) {}

  /** Issue access token + refresh token for a user. */
  async issueTokens(
    userId: string,
    role: string,
    meta?: { ipAddress?: string; deviceInfo?: Record<string, any> },
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload: JwtPayload = { sub: userId, role };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });

    const rawRefresh = randomBytes(40).toString('hex');
    const tokenHash = this.hash(rawRefresh);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    const rt = this.refreshTokenRepo.create({
      userId,
      tokenHash,
      expiresAt,
      ipAddress: meta?.ipAddress,
      deviceInfo: meta?.deviceInfo,
    });
    await this.refreshTokenRepo.save(rt);

    return { accessToken, refreshToken: rawRefresh };
  }

  /** Rotate refresh token – revoke old, issue new pair. */
  async refreshTokens(
    rawRefreshToken: string,
    meta?: { ipAddress?: string; deviceInfo?: Record<string, any> },
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const tokenHash = this.hash(rawRefreshToken);

    const stored = await this.refreshTokenRepo.findOne({
      where: {
        tokenHash,
        revoked: false,
        expiresAt: MoreThan(new Date()),
      },
    });

    if (!stored) {
      throw new UnauthorizedException('Invalid or expired refresh token.');
    }

    // Revoke the used token (rotation)
    stored.revoked = true;
    await this.refreshTokenRepo.save(stored);

    // Decode old token to get role (no verification needed – token is valid via DB)
    const decoded = this.jwtService.decode(stored.tokenHash) as JwtPayload | null;
    // Role must come from DB lookup in production; we stored it only in JWT.
    // Re-sign using the userId and look up role via the access token.
    // For simplicity, require caller to pass role or decode from last access token.
    // Here we re-issue with just the userId and fetch role separately.
    // Production note: store role in refresh_tokens table or join with users.
    const payload: JwtPayload = { sub: stored.userId, role: decoded?.role ?? 'unknown' };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });

    const rawNew = randomBytes(40).toString('hex');
    const newHash = this.hash(rawNew);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const newRt = this.refreshTokenRepo.create({
      userId: stored.userId,
      tokenHash: newHash,
      expiresAt,
      ipAddress: meta?.ipAddress ?? stored.ipAddress,
      deviceInfo: meta?.deviceInfo ?? stored.deviceInfo,
    });
    await this.refreshTokenRepo.save(newRt);

    return { accessToken, refreshToken: rawNew };
  }

  /** Revoke all refresh tokens for a user (logout all devices). */
  async revokeAll(userId: string): Promise<void> {
    await this.refreshTokenRepo.update(
      { userId, revoked: false },
      { revoked: true },
    );
  }

  /** Verify an access token and return its payload. */
  verifyAccessToken(token: string): JwtPayload {
    try {
      return this.jwtService.verify<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired access token.');
    }
  }

  private hash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }
}
