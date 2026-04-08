<<<<<<< HEAD
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import * as bcrypt from 'bcrypt';
import { OtpPurpose } from '../entities/otp-code.entity';

interface OtpRecord {
  codeHash: string;
  attempts: number;
}

const OTP_TTL_MS = 10 * 60 * 1000;   // 10 minutes
const MAX_ATTEMPTS = 3;

@Injectable()
export class OtpService {
  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {}

  private key(userId: string, purpose: OtpPurpose): string {
    return `otp:${userId}:${purpose}`;
  }

  async saveOtp(userId: string, purpose: OtpPurpose, phone: string): Promise<void> {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = await bcrypt.hash(code, 10);

    await this.cache.set(this.key(userId, purpose), { codeHash, attempts: 0 } as OtpRecord, OTP_TTL_MS);

    // Mock SMS — replace with real SMS provider later
    console.log(`[OTP] Phone: ${phone} | Code: ${code} | Expires in 10 min`);
  }

  async verifyOtp(userId: string, purpose: OtpPurpose, plainCode: string): Promise<void> {
    const record = await this.cache.get<OtpRecord>(this.key(userId, purpose));

    if (!record) {
      throw new BadRequestException('OTP not found or expired');
    }

    if (record.attempts >= MAX_ATTEMPTS) {
      await this.cache.del(this.key(userId, purpose));
      throw new BadRequestException('Maximum OTP attempts exceeded');
    }

    // Increment attempts
    await this.cache.set(
      this.key(userId, purpose),
      { ...record, attempts: record.attempts + 1 },
      OTP_TTL_MS,
    );

    const isMatch = await bcrypt.compare(plainCode, record.codeHash);
    if (!isMatch) {
      throw new BadRequestException('Invalid OTP');
    }

    // Valid — remove from cache
    await this.cache.del(this.key(userId, purpose));
=======
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomInt, createHash } from 'crypto';
import { OtpCode, OtpPurpose } from '../entities/otp-code.entity';

const OTP_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;

@Injectable()
export class OtpService {
  constructor(
    @InjectRepository(OtpCode)
    private readonly otpRepo: Repository<OtpCode>,
  ) {}

  /** Generate a 6-digit OTP, save its hash, return plain code (simulate SMS send). */
  async generateAndSave(userId: string, purpose: OtpPurpose): Promise<string> {
    // Invalidate any existing active OTP for this user+purpose
    await this.otpRepo.delete({ userId, purpose });

    const code = String(randomInt(100000, 999999));
    const codeHash = this.hash(code);

    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

    const otp = this.otpRepo.create({ userId, codeHash, purpose, expiresAt });
    await this.otpRepo.save(otp);

    // In production: send via SMS gateway. Here we return it for integration.
    return code;
  }

  /** Verify the code. Throws on failure; marks usedAt on success. */
  async verify(userId: string, code: string, purpose: OtpPurpose): Promise<void> {
    const otp = await this.otpRepo.findOne({ where: { userId, purpose } });

    if (!otp) {
      throw new BadRequestException('No pending verification code found.');
    }
    if (otp.usedAt) {
      throw new BadRequestException('Code already used.');
    }
    if (new Date() > otp.expiresAt) {
      throw new BadRequestException('Verification code expired.');
    }
    if (otp.attempts >= MAX_ATTEMPTS) {
      throw new BadRequestException('Too many attempts. Request a new code.');
    }

    const match = otp.codeHash === this.hash(code);

    if (!match) {
      otp.attempts += 1;
      await this.otpRepo.save(otp);
      throw new BadRequestException('Invalid verification code.');
    }

    otp.usedAt = new Date();
    await this.otpRepo.save(otp);
  }

  private hash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
>>>>>>> 9a25fd6a14dd7d6993717c6a143c8ccc44d2c806
  }
}
