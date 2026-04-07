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
  }
}
