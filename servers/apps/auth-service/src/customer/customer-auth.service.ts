import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole, UserStatus } from '../entities/user.entity';
import { OtpService } from '../otp/otp.service';
import { TokenService } from '../token/token.service';
import { OtpPurpose } from '../entities/otp-code.entity';
import { RegisterCustomerDto } from './dto/register-customer.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { SetPasswordDto } from './dto/set-password.dto';
import { LoginCustomerDto } from './dto/login-customer.dto';

@Injectable()
export class CustomerAuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly otpService: OtpService,
    private readonly tokenService: TokenService,
  ) {}

  /** Step 1 – verifyData() → saveCode() → returns OTP (simulated SMS send). */
  async register(dto: RegisterCustomerDto): Promise<{ userId: string; message: string; otp: string }> {
    const existing = await this.userRepo.findOne({ where: { phone: dto.mobileNo } });
    if (existing) {
      throw new ConflictException('Phone number already registered.');
    }

    const birth = new Date(dto.birthdate);
    const now = new Date();
    const ageYears = (now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    if (isNaN(birth.getTime()) || birth >= now || ageYears < 10) {
      throw new BadRequestException('Invalid birthdate.');
    }

    const user = this.userRepo.create({
      phone: dto.mobileNo,
      fullName: dto.fullName,
      role: UserRole.CUSTOMER,
      status: UserStatus.PENDING,
      passwordHash: '',
      deviceInfo: { birthdate: dto.birthdate },
    });
    await this.userRepo.save(user);

    const otp = await this.otpService.generateAndSave(user.id, OtpPurpose.PHONE_VERIFY);

    return {
      userId: user.id,
      message: 'Verification code sent to your mobile number.',
      otp,
    };
  }

  /** Step 2 – verfiyCode(). */
  async verifyOtp(dto: VerifyOtpDto): Promise<{ message: string }> {
    const user = await this.findUser(dto.userId);
    await this.otpService.verify(user.id, dto.code, OtpPurpose.PHONE_VERIFY);
    user.phoneVerifiedAt = new Date();
    await this.userRepo.save(user);
    return { message: 'Phone verified. Please create your password.' };
  }

  /** Step 3 – saveCustomer() → account becomes ACTIVE. */
  async setPassword(dto: SetPasswordDto): Promise<{ message: string }> {
    const user = await this.findUser(dto.userId);
    if (!user.phoneVerifiedAt) {
      throw new BadRequestException('Phone not verified yet.');
    }
    user.passwordHash = await bcrypt.hash(dto.password, 12);
    user.status = UserStatus.ACTIVE;
    await this.userRepo.save(user);
    return { message: 'Account created successfully.' };
  }

  /** Login – returns access token + refresh token. */
  async login(
    dto: LoginCustomerDto,
    meta?: { ipAddress?: string },
  ): Promise<{ accessToken: string; refreshToken: string; userId: string; role: string }> {
    const user = await this.userRepo.findOne({ where: { phone: dto.phone, role: UserRole.CUSTOMER } });

    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid phone number or password.');
    }
    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Account is not active.');
    }

    user.lastLoginAt = new Date();
    await this.userRepo.save(user);

    const { accessToken, refreshToken } = await this.tokenService.issueTokens(
      user.id,
      user.role,
      { ipAddress: meta?.ipAddress },
    );

    return { accessToken, refreshToken, userId: user.id, role: user.role };
  }

  private async findUser(userId: string): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id: userId, role: UserRole.CUSTOMER } });
    if (!user) throw new BadRequestException('User not found.');
    return user;
  }
}
