import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";
import * as bcrypt from "bcrypt";
import { OtpPurpose } from "../entities/otp-code.entity";

interface OtpRecord {
  codeHash: string;
  attempts: number;
}

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 3;

@Injectable()
export class OtpService {
  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {}

  private key(userId: string, purpose: OtpPurpose): string {
    return `otp:${userId}:${purpose}`;
  }

  async saveOtp(
    userId: string,
    purpose: OtpPurpose,
    phone: string,
  ): Promise<void> {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = await bcrypt.hash(code, 10);

    await this.cache.set(
      this.key(userId, purpose),
      { codeHash, attempts: 0 } as OtpRecord,
      OTP_TTL_MS,
    );

    // Mock SMS — replace with real SMS provider later
    console.log(`[OTP] Phone: ${phone} | Code: ${code} | Expires in 10 min`);
  }

  async verifyOtp(
    userId: string,
    purpose: OtpPurpose,
    plainCode: string,
  ): Promise<void> {
    const record = await this.cache.get<OtpRecord>(this.key(userId, purpose));

    if (!record) {
      throw new BadRequestException("OTP not found or expired");
    }

    if (record.attempts >= MAX_ATTEMPTS) {
      await this.cache.del(this.key(userId, purpose));
      throw new BadRequestException("Maximum OTP attempts exceeded");
    }

    // Increment attempts
    await this.cache.set(
      this.key(userId, purpose),
      { ...record, attempts: record.attempts + 1 },
      OTP_TTL_MS,
    );

    const isMatch = await bcrypt.compare(plainCode, record.codeHash);
    if (!isMatch) {
      throw new BadRequestException("Invalid OTP");
    }

    // Valid — remove from cache
    await this.cache.del(this.key(userId, purpose));
  }
}
