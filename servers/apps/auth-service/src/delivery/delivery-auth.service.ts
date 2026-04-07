import {
  Injectable,
  BadRequestException,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { User, UserRole, UserStatus } from '../entities/user.entity';
import { OtpService } from '../otp/otp.service';
import { OtpPurpose } from '../entities/otp-code.entity';
import { RegisterDeliveryDto } from './dto/register-delivery.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { LoginDeliveryDto } from './dto/login-delivery.dto';
import { ApproveDeliveryDto } from './dto/approve-delivery.dto';

@Injectable()
export class DeliveryAuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly otpService: OtpService,
  ) {}

  /**
   * Step 1 – freelance() → checkingData() → saveCode() → sends OTP.
   * Diagram: Delivery sends (full name, phone, ID_pic, transport) → Server validates → sends Code.
   */
  async register(dto: RegisterDeliveryDto): Promise<{ userId: string; message: string; otp: string }> {
    const existing = await this.userRepo.findOne({ where: { phone: dto.phone } });
    if (existing) {
      throw new ConflictException('Phone number already registered.');
    }

    // checkingData(): validate ID pic is provided and transport is valid
    if (!dto.idPic || dto.idPic.length < 10) {
      throw new BadRequestException('ID picture is required.');
    }

    const user = this.userRepo.create({
      phone: dto.phone,
      fullName: dto.fullName,
      role: UserRole.DELIVERY,
      status: UserStatus.PENDING,
      passwordHash: '',
      deviceInfo: {
        idPic: dto.idPic,
        transport: dto.transport,
      },
    });
    await this.userRepo.save(user);

    // Generate OTP (Code Service simulation)
    const otp = await this.otpService.generateAndSave(user.id, OtpPurpose.PHONE_VERIFY);

    return {
      userId: user.id,
      message: 'Verification code sent to your mobile number.',
      otp, // In production sent via SMS
    };
  }

  /**
   * Step 2 – verifyCode(): Delivery submits OTP.
   * If valid → 48h background check (stays PENDING, admin will approve/reject).
   */
  async verifyOtp(dto: VerifyOtpDto): Promise<{ message: string }> {
    const user = await this.findPendingDelivery(dto.userId);

    await this.otpService.verify(user.id, dto.code, OtpPurpose.PHONE_VERIFY);

    user.phoneVerifiedAt = new Date();
    await this.userRepo.save(user);

    // Status remains PENDING – admin must approve within 48h
    return {
      message: 'Phone verified. Your application is under review (up to 48 hours).',
    };
  }

  /**
   * Admin action – approve delivery agent → sendPassword().
   * Sets status to ACTIVE and generates a password.
   */
  async approve(dto: ApproveDeliveryDto): Promise<{ message: string; generatedPassword: string }> {
    const user = await this.userRepo.findOne({
      where: { id: dto.userId, role: UserRole.DELIVERY },
    });

    if (!user) {
      throw new NotFoundException('Delivery agent not found.');
    }
    if (!user.phoneVerifiedAt) {
      throw new BadRequestException('Phone not verified. Cannot approve.');
    }
    if (user.status === UserStatus.ACTIVE) {
      throw new BadRequestException('Agent already approved.');
    }

    const generatedPassword = randomBytes(6).toString('base64url');
    user.passwordHash = await bcrypt.hash(generatedPassword, 12);
    user.status = UserStatus.ACTIVE;
    await this.userRepo.save(user);

    // In production: send generatedPassword via SMS
    return {
      message: 'Delivery agent approved. Password sent to their mobile number.',
      generatedPassword, // Exposed here only for development/testing
    };
  }

  /**
   * Admin action – reject delivery agent.
   */
  async reject(userId: string): Promise<{ message: string }> {
    const user = await this.userRepo.findOne({
      where: { id: userId, role: UserRole.DELIVERY },
    });

    if (!user) {
      throw new NotFoundException('Delivery agent not found.');
    }

    user.status = UserStatus.BANNED;
    await this.userRepo.save(user);

    // In production: send rejection SMS
    return { message: 'Delivery agent rejected.' };
  }

  /**
   * Login(phone, password) → Dashboard.
   */
  async login(dto: LoginDeliveryDto): Promise<{ userId: string; role: string }> {
    const user = await this.userRepo.findOne({
      where: { phone: dto.phone, role: UserRole.DELIVERY },
    });

    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid phone number or password.');
    }
    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Account is not active or pending approval.');
    }

    user.lastLoginAt = new Date();
    await this.userRepo.save(user);

    return { userId: user.id, role: user.role };
  }

  private async findPendingDelivery(userId: string): Promise<User> {
    const user = await this.userRepo.findOne({
      where: { id: userId, role: UserRole.DELIVERY },
    });
    if (!user) {
      throw new BadRequestException('User not found.');
    }
    return user;
  }
}
