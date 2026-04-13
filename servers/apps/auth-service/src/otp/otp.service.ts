import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";
import * as bcrypt from "bcrypt";
import { OtpPurpose } from "../entities/otp-code.entity";

interface OtpRecord {
  codeHash: string;
  attempts: number;
}

<<<<<<< HEAD
const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 3;
=======
interface RateRecord {
  count: number;
  windowStart: number; // ms — window expires at windowStart + 24h
}

const OTP_TTL_MS = 2 * 60 * 1000;            // 2 minutes — code validity
const OTP_RATE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours  — rate window
const MAX_VERIFY_ATTEMPTS = 3;                // wrong-code attempts before code is locked
const MAX_OTP_SENDS = 3;                      // sends allowed per 24h window
>>>>>>> auth-serivces-release-1

@Injectable()
export class OtpService {
  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {}

  private otpKey(userId: string, purpose: OtpPurpose): string {
    return `otp:${userId}:${purpose}`;
  }

<<<<<<< HEAD
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
=======
  private rateKey(userId: string, purpose: OtpPurpose): string {
    return `otp_rate:${userId}:${purpose}`;
  }

  // ─── Send OTP ─────────────────────────────────────────────────────────────────
  // Enforces max 3 sends per 24-hour window.
  // Throws if an active (non-expired, non-maxed) OTP already exists — no wasting sends.

  async saveOtp(userId: string, purpose: OtpPurpose, phone: string): Promise<void> {
    // Block resend if a live OTP still exists and has remaining attempts
    const existing = await this.cache.get<OtpRecord>(this.otpKey(userId, purpose));
    if (existing && existing.attempts < MAX_VERIFY_ATTEMPTS) {
      throw new BadRequestException(
        'An OTP was already sent and is still valid. Please check your phone.',
      );
    }

    // Enforce 24h send rate limit
    await this.checkRateLimit(userId, purpose);

    const code = Math.floor(100_000 + Math.random() * 900_000).toString();
    const codeHash = await bcrypt.hash(code, 10);

    await this.cache.set(
      this.otpKey(userId, purpose),
      { codeHash, attempts: 0 } satisfies OtpRecord,
      OTP_TTL_MS,
    );

    // Mock SMS — swap for real SMS provider (e.g. Twilio)
    console.log(`[OTP] Phone: ${phone} | Code: ${code} | Purpose: ${purpose} | Expires: 2 min`);
  }

  // ─── Verify OTP ────────────────────────────────────────────────────────────────
  // On max attempts: deletes the locked OTP and checks the rate limit so the error
  // message tells the user whether they can still request a new code or are fully blocked.

  async verifyOtp(userId: string, purpose: OtpPurpose, plainCode: string): Promise<void> {
    const record = await this.cache.get<OtpRecord>(this.otpKey(userId, purpose));

    if (!record) {
      throw new BadRequestException('OTP not found or expired. Request a new one.');
    }

    if (record.attempts >= MAX_VERIFY_ATTEMPTS) {
      await this.cache.del(this.otpKey(userId, purpose));
      // Check whether the user can still resend or is fully blocked for the day
      const canResend = await this.canRequestNewCode(userId, purpose);
      if (canResend) {
        throw new BadRequestException(
          'Maximum attempts exceeded. You can request a new OTP code.',
        );
      } else {
        const hoursLeft = await this.hoursUntilReset(userId, purpose);
        throw new BadRequestException(
          `Maximum attempts exceeded and daily OTP limit reached. Try again in approximately ${hoursLeft} hour(s).`,
        );
      }
>>>>>>> auth-serivces-release-1
    }

    // Increment attempt count before comparing to prevent race-window bypass
    await this.cache.set(
      this.otpKey(userId, purpose),
      { ...record, attempts: record.attempts + 1 },
      OTP_TTL_MS,
    );

    const isMatch = await bcrypt.compare(plainCode, record.codeHash);
    if (!isMatch) {
<<<<<<< HEAD
      throw new BadRequestException("Invalid OTP");
=======
      const attemptsLeft = MAX_VERIFY_ATTEMPTS - (record.attempts + 1);
      throw new BadRequestException(
        attemptsLeft > 0
          ? `Invalid OTP code. ${attemptsLeft} attempt(s) remaining.`
          : 'Invalid OTP code. No attempts remaining — request a new code.',
      );
>>>>>>> auth-serivces-release-1
    }

    // Correct code — clear OTP and reset rate window (fresh budget for next session)
    await this.cache.del(this.otpKey(userId, purpose));
    await this.cache.del(this.rateKey(userId, purpose));
  }

  // ─── Public helpers (used by auth.service resendOtp) ─────────────────────────

  /** Returns true when there is NO active (non-maxed, non-expired) OTP in cache. */
  async hasActiveOtp(userId: string, purpose: OtpPurpose): Promise<boolean> {
    const record = await this.cache.get<OtpRecord>(this.otpKey(userId, purpose));
    return !!record && record.attempts < MAX_VERIFY_ATTEMPTS;
  }

  /** Returns true when the user still has sends remaining in their 24h window. */
  async canRequestNewCode(userId: string, purpose: OtpPurpose): Promise<boolean> {
    const rate = await this.cache.get<RateRecord>(this.rateKey(userId, purpose));
    return !rate || rate.count < MAX_OTP_SENDS;
  }

  // ─── Private helpers ──────────────────────────────────────────────────────────

  private async hoursUntilReset(userId: string, purpose: OtpPurpose): Promise<number> {
    const rate = await this.cache.get<RateRecord>(this.rateKey(userId, purpose));
    if (!rate) return 0;
    const resetInMs = OTP_RATE_TTL_MS - (Date.now() - rate.windowStart);
    return Math.max(1, Math.ceil(resetInMs / (60 * 60 * 1000)));
  }

  private async checkRateLimit(userId: string, purpose: OtpPurpose): Promise<void> {
    const rate = await this.cache.get<RateRecord>(this.rateKey(userId, purpose));
    const now = Date.now();

    if (!rate) {
      await this.cache.set(
        this.rateKey(userId, purpose),
        { count: 1, windowStart: now } satisfies RateRecord,
        OTP_RATE_TTL_MS,
      );
      return;
    }

    if (rate.count >= MAX_OTP_SENDS) {
      const hoursLeft = Math.max(1, Math.ceil((OTP_RATE_TTL_MS - (now - rate.windowStart)) / (60 * 60 * 1000)));
      throw new BadRequestException(
        `OTP limit reached. You can request again in approximately ${hoursLeft} hour(s).`,
      );
    }

    const remainingTTL = Math.max(1, OTP_RATE_TTL_MS - (now - rate.windowStart));
    await this.cache.set(
      this.rateKey(userId, purpose),
      { count: rate.count + 1, windowStart: rate.windowStart } satisfies RateRecord,
      remainingTTL,
    );
  }
}
