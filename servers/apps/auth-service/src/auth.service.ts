import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import * as bcrypt from 'bcrypt';
import { User, UserRole, UserStatus } from './entities/user.entity';
import { OtpPurpose } from './entities/otp-code.entity';
import { AppJwtService } from './jwt/jwt.service';
import { OtpService } from './otp/otp.service';
import {
  RegisterCustomerDto,
  RegisterDeliveryCompanyDto,
  RegisterDeliveryDto,
  RegisterManagerDto,
  RegisterRestaurantDto,
} from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

// Roles that log in with phone + system-generated password
const PHONE_PASSWORD_ROLES = [
  UserRole.RESTAURANT_OWNER,
  UserRole.DELIVERY,
  UserRole.DELIVERY_COMPANY,
];

// NATS event emitted when each role is approved
const APPROVAL_EVENT: Partial<Record<UserRole, string>> = {
  [UserRole.RESTAURANT_OWNER]: 'restaurant.approved',
  [UserRole.DELIVERY]: 'delivery.agent.approved',
  [UserRole.DELIVERY_COMPANY]: 'delivery.company.approved',
};

function generatePassword(length = 10): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  return Array.from({ length }, () =>
    chars[Math.floor(Math.random() * chars.length)],
  ).join('');
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly otpService: OtpService,
    private readonly jwtService: AppJwtService,
    @Inject('NATS_SERVICE')
    private readonly natsClient: ClientProxy,
  ) {}

  // ─── Customer ────────────────────────────────────────────────────────────────

  async registerCustomer(dto: RegisterCustomerDto) {
    const existing = await this.userRepo.findOne({ where: { phone: dto.phone } });
    if (existing) throw new BadRequestException('Phone already registered');

    const user = await this.userRepo.save(
      this.userRepo.create({
        phone: dto.phone,
        role: UserRole.CUSTOMER,
        status: UserStatus.PENDING,
      }),
    );

    await this.otpService.saveOtp(user.id, OtpPurpose.PHONE_VERIFY, dto.phone);

    this.natsClient.emit('user.customer.created', {
      userId: user.id,
      fullName: `${dto.firstName} ${dto.lastName}`,
      dateOfBirth: dto.dateOfBirth,
      locationLat: dto.locationLat ?? null,
      locationLng: dto.locationLng ?? null,
    });

    return { data: { userId: user.id }, message: 'OTP sent. Check server log for the code.' };
  }

  // ─── Restaurant ───────────────────────────────────────────────────────────────
  // Login: phone + system-generated password (sent after manager approval)

  async registerRestaurant(dto: RegisterRestaurantDto) {
    const existing = await this.userRepo.findOne({ where: { phone: dto.primaryPhone } });
    if (existing) throw new BadRequestException('Phone already registered');

    const user = await this.userRepo.save(
      this.userRepo.create({
        phone: dto.primaryPhone,
        role: UserRole.RESTAURANT_OWNER,
        status: UserStatus.PENDING,
      }),
    );

    this.natsClient.emit('user.restaurant.created', {
      userId: user.id,
      name: dto.restaurantName,
      ownerName: dto.ownerName,
      phone: dto.primaryPhone,
      street: dto.address ?? null,
    });

    return {
      data: { userId: user.id },
      message: 'Registration submitted. Awaiting manager approval.',
    };
  }

  // ─── Delivery Agent ───────────────────────────────────────────────────────────
  // Login: phone + system-generated password (sent after manager approval)

  async registerDelivery(dto: RegisterDeliveryDto) {
    const existing = await this.userRepo.findOne({ where: { phone: dto.phone } });
    if (existing) throw new BadRequestException('Phone already registered');

    const user = await this.userRepo.save(
      this.userRepo.create({
        phone: dto.phone,
        role: UserRole.DELIVERY,
        status: UserStatus.PENDING,
      }),
    );

    await this.otpService.saveOtp(user.id, OtpPurpose.PHONE_VERIFY, dto.phone);

    this.natsClient.emit('user.delivery.created', {
      userId: user.id,
      fullName: `${dto.firstName} ${dto.lastName}`,
      phone: dto.phone,
      agentType: dto.agentType,
      address: dto.address ?? null,
    });

    return { data: { userId: user.id }, message: 'OTP sent. Check server log for the code.' };
  }

  // ─── Delivery Company ─────────────────────────────────────────────────────────
  // Login: phone + system-generated password (sent after manager approval)

  async registerDeliveryCompany(dto: RegisterDeliveryCompanyDto) {
    const existing = await this.userRepo.findOne({ where: { phone: dto.phone } });
    if (existing) throw new BadRequestException('Phone already registered');

    const user = await this.userRepo.save(
      this.userRepo.create({
        phone: dto.phone,
        role: UserRole.DELIVERY_COMPANY,
        status: UserStatus.PENDING,
      }),
    );

    this.natsClient.emit('user.delivery_company.created', {
      userId: user.id,
      companyName: dto.companyName,
      phone: dto.phone,
      contractType: dto.contractType,
    });

    return {
      data: { userId: user.id },
      message: 'Registration submitted. Awaiting manager approval.',
    };
  }

  // ─── Manager ─────────────────────────────────────────────────────────────────
  // Manager creates their own password at registration — protected by MANAGER role

  async registerManager(dto: RegisterManagerDto) {
    const existing = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existing) throw new BadRequestException('Email already in use');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.userRepo.save(
      this.userRepo.create({
        email: dto.email,
        passwordHash,
        role: UserRole.MANAGER,
        status: UserStatus.ACTIVE,
      }),
    );

    this.natsClient.emit('user.manager.created', {
      userId: user.id,
      fullName: dto.fullName,
    });

    return {
      data: { id: user.id, email: user.email, role: user.role },
      message: 'Manager account created',
    };
  }

  // ─── Approval (generate + assign password, activate user) ────────────────────
  // Applies to: RESTAURANT_OWNER, DELIVERY, DELIVERY_COMPANY
  // Emits a NATS event so the domain service can update its own records

  async approveUser(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    if (!APPROVAL_EVENT[user.role]) {
      throw new BadRequestException('Approval not applicable for this role');
    }
    if (user.status === UserStatus.ACTIVE) {
      throw new BadRequestException('User is already active');
    }

    const plainPassword = generatePassword();
    await this.userRepo.update(userId, {
      status: UserStatus.ACTIVE,
      passwordHash: await bcrypt.hash(plainPassword, 10),
    });

    // Mock SMS — replace with real provider
    console.log(`[APPROVAL] Phone: ${user.phone} | Temp Password: ${plainPassword}`);

    this.natsClient.emit(APPROVAL_EVENT[user.role], { userId });

    return {
      data: { userId, role: user.role },
      message: 'User approved. Temporary password sent to their phone.',
    };
  }

  // ─── OTP Verification (registration only — customer + delivery agent) ─────────

  async verifyOtp(dto: VerifyOtpDto) {
    const user = await this.userRepo.findOne({ where: { id: dto.userId } });
    if (!user) throw new NotFoundException('User not found');

    if (user.role !== UserRole.CUSTOMER && user.role !== UserRole.DELIVERY) {
      throw new BadRequestException('OTP verification not applicable for this role');
    }
    if (user.phoneVerifiedAt) {
      throw new BadRequestException('Phone already verified');
    }

    await this.otpService.verifyOtp(user.id, OtpPurpose.PHONE_VERIFY, dto.otp);
    await this.userRepo.update(user.id, { phoneVerifiedAt: new Date() });

    if (user.role === UserRole.CUSTOMER) {
      await this.userRepo.update(user.id, { status: UserStatus.ACTIVE });
      const payload = { sub: user.id, role: user.role, phone: user.phone };
      return {
        data: {
          accessToken: this.jwtService.signAccessToken(payload),
          refreshToken: await this.jwtService.signRefreshToken(payload),
        },
        message: 'Phone verified. Welcome!',
      };
    }

    // DELIVERY — phone verified, stays PENDING until manager approves
    return {
      data: { userId: user.id },
      message: 'Phone verified. Your account is pending admin approval.',
    };
  }

  // ─── Login ────────────────────────────────────────────────────────────────────

  async login(dto: LoginDto) {
    // Customer: phone → OTP step
    if (dto.role === UserRole.CUSTOMER) {
      if (!dto.phone) throw new BadRequestException('Phone is required');
      const user = await this.userRepo.findOne({
        where: { phone: dto.phone, role: UserRole.CUSTOMER },
      });
      if (!user) throw new NotFoundException('No account found');
      if (user.status !== UserStatus.ACTIVE) throw new UnauthorizedException('Account not active');
      await this.otpService.saveOtp(user.id, OtpPurpose.PHONE_VERIFY, dto.phone);
      return { data: { userId: user.id }, message: 'OTP sent. Check server log.' };
    }

    // Manager: email + password → tokens directly
    if (dto.role === UserRole.MANAGER) {
      if (!dto.email || !dto.password) {
        throw new BadRequestException('Email and password are required');
      }
      const user = await this.userRepo.findOne({
        where: { email: dto.email, role: UserRole.MANAGER },
      });
      if (!user) throw new UnauthorizedException('Invalid credentials');
      const ok = await bcrypt.compare(dto.password, user.passwordHash);
      if (!ok) throw new UnauthorizedException('Invalid credentials');
      if (user.status !== UserStatus.ACTIVE) throw new UnauthorizedException('Account not active');
      await this.userRepo.update(user.id, { lastLoginAt: new Date() });
      const payload = { sub: user.id, role: user.role, email: user.email };
      return {
        data: {
          accessToken: this.jwtService.signAccessToken(payload),
          refreshToken: await this.jwtService.signRefreshToken(payload),
        },
        message: 'Login successful',
      };
    }

    // Restaurant / Delivery / Delivery Company: phone + password → tokens directly
    if (PHONE_PASSWORD_ROLES.includes(dto.role)) {
      if (!dto.phone || !dto.password) {
        throw new BadRequestException('Phone and password are required');
      }
      const user = await this.userRepo.findOne({ where: { phone: dto.phone, role: dto.role } });
      if (!user || !user.passwordHash) throw new UnauthorizedException('Invalid credentials');
      const ok = await bcrypt.compare(dto.password, user.passwordHash);
      if (!ok) throw new UnauthorizedException('Invalid credentials');
      if (user.status !== UserStatus.ACTIVE) {
        throw new UnauthorizedException('Account not active or pending approval');
      }
      await this.userRepo.update(user.id, { lastLoginAt: new Date() });
      const payload = { sub: user.id, role: user.role, phone: user.phone };
      return {
        data: {
          accessToken: this.jwtService.signAccessToken(payload),
          refreshToken: await this.jwtService.signRefreshToken(payload),
        },
        message: 'Login successful',
      };
    }

    throw new BadRequestException('Invalid role');
  }

  // OTP second step for customer login
  async verifyLoginOtp(dto: VerifyOtpDto) {
    const user = await this.userRepo.findOne({ where: { id: dto.userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.role !== UserRole.CUSTOMER) {
      throw new BadRequestException('OTP login only available for customers');
    }
    await this.otpService.verifyOtp(user.id, OtpPurpose.PHONE_VERIFY, dto.otp);
    await this.userRepo.update(user.id, { lastLoginAt: new Date() });
    const payload = { sub: user.id, role: user.role, phone: user.phone };
    return {
      data: {
        accessToken: this.jwtService.signAccessToken(payload),
        refreshToken: await this.jwtService.signRefreshToken(payload),
      },
      message: 'Login successful',
    };
  }

  // ─── Token Management ──────────────────────────────────────────────────────────

  async refresh(token: string) {
    const payload = await this.jwtService.verifyRefreshToken(token);
    return {
      data: {
        accessToken: this.jwtService.signAccessToken({
          sub: payload.sub,
          role: payload.role,
          phone: payload.phone,
          email: payload.email,
        }),
      },
      message: 'Token refreshed',
    };
  }

  async logout(userId: string, token: string) {
    await this.jwtService.revokeRefreshToken(token);
    return { data: null, message: 'Logged out' };
  }
}
