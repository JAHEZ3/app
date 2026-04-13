import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ClientProxy } from "@nestjs/microservices";
import * as bcrypt from "bcrypt";
import { User, UserRole, UserStatus } from "./entities/user.entity";
import { OtpPurpose } from "./entities/otp-code.entity";
import { AppJwtService } from "./jwt/jwt.service";
import { OtpService } from "./otp/otp.service";
import {
  RegisterCustomerDto,
  RegisterDeliveryDto,
  RegisterManagerDto,
  RegisterRestaurantDto,
} from "./dto/register.dto";
import {
  LoginCustomerDto,
  LoginDeliveryDto,
  LoginManagerDto,
  LoginRestaurantDto,
} from "./dto/login.dto";
import { ResendOtpDto, VerifyOtpDto } from "./dto/verify-otp.dto";

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly otpService: OtpService,
    private readonly jwtService: AppJwtService,
    @Inject("NATS_SERVICE")
    private readonly natsClient: ClientProxy,
  ) {}

  // ─── Customer ────────────────────────────────────────────────────────────────

  async registerCustomer(dto: RegisterCustomerDto) {
    const existing = await this.userRepo.findOne({
      where: { phone: dto.phone },
    });
    if (existing) {
      throw new BadRequestException("This phone number is already registered.");
    }

    const user = await this.userRepo.save(
      this.userRepo.create({
        phone: dto.phone,
        role: UserRole.CUSTOMER,
        status: UserStatus.PENDING,
        ...(dto.deviceInfo && { deviceInfo: dto.deviceInfo }),
      }),
    );

    // Emit immediately — customer-service creates the profile record
    this.natsClient.emit("user.customer.created", {
      userId: user.id,
      phone: user.phone,
    });

    await this.otpService.saveOtp(user.id, OtpPurpose.PHONE_VERIFY, dto.phone);

    return {
      data: {
        id: user.id,
        phone: user.phone,
        role: user.role,
        status: user.status,
        phoneVerifiedAt: user.phoneVerifiedAt,
        createdAt: user.createdAt,
      },
      message: "Account created. OTP sent to verify your phone.",
    };
  }

  // ─── Delivery Agent ───────────────────────────────────────────────────────────
  // Step 1: phone → OTP
  // Step 2: verify OTP → system-generated temp password + tokens returned immediately
  // Step 3: complete profile (name, docs, vehicle) via delivery-service HTTP endpoint

  async registerDelivery(dto: RegisterDeliveryDto) {
    const existing = await this.userRepo.findOne({
      where: { phone: dto.phone },
    });
    if (existing) {
      throw new BadRequestException("This phone number is already registered.");
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.userRepo.save(
      this.userRepo.create({
        phone: dto.phone,
        role: UserRole.DELIVERY,
        status: UserStatus.PENDING,
        passwordHash,
      }),
    );
    await this.otpService.saveOtp(user.id, OtpPurpose.PHONE_VERIFY, dto.phone);
    return {
      data: { userId: user.id },
      message: "OTP sent. Check server log for the code.",
    };
  }

  // ─── Forgot password (delivery agent) ─────────────────────────────────────────
  // TODO: Implement OTP-based password reset in a future sprint.
  // Flow: verify phone via OTP → allow setting a new password.

  async forgotPasswordDelivery(_phone: string) {
    return {
      data: null,
      message: "Password reset feature coming soon. Contact support.",
    };
  }

  // ─── OTP Verification (registration — customer, delivery, restaurant) ──────────

  async verifyOtp(dto: VerifyOtpDto) {
    const user = await this.userRepo.findOne({ where: { id: dto.userId } });
    if (!user) throw new NotFoundException("User not found");

    const otpVerifyRoles = [
      UserRole.CUSTOMER,
      UserRole.DELIVERY,
      UserRole.RESTAURANT_OWNER,
    ];
    if (!otpVerifyRoles.includes(user.role)) {
      throw new BadRequestException(
        "OTP verification not applicable for this role",
      );
    }
    if (user.phoneVerifiedAt) {
      throw new BadRequestException("Phone already verified");
    }

    await this.otpService.verifyOtp(user.id, OtpPurpose.PHONE_VERIFY, dto.otp);

    if (user.role === UserRole.CUSTOMER) {
      await this.userRepo.update(user.id, {
        phoneVerifiedAt: new Date(),
        status: UserStatus.ACTIVE,
      });
      const payload = { sub: user.id, role: user.role, phone: user.phone };
      return {
        data: {
          accessToken: this.jwtService.signAccessToken(payload),
          refreshToken: await this.jwtService.signRefreshToken(payload),
        },
        message: "Phone verified.",
      };
    }

    if (
      user.role === UserRole.DELIVERY ||
      user.role === UserRole.RESTAURANT_OWNER
    ) {
      // Phone verified — account moves to SUSPENDED (pending manager approval).
      // User can log in with their password to complete their profile.
      await this.userRepo.update(user.id, {
        phoneVerifiedAt: new Date(),
        status: UserStatus.SUSPENDED,
      });
      const payload = { sub: user.id, role: user.role, phone: user.phone };
      return {
        data: {
          accessToken: this.jwtService.signAccessToken(payload),
          refreshToken: await this.jwtService.signRefreshToken(payload),
        },
        message:
          "Phone verified. Your account is pending manager approval. Complete your profile to proceed.",
      };
    }
  }

  // ─── Customer login: phone → OTP → customer/login/verify-otp for tokens ────────

  async loginCustomer(dto: LoginCustomerDto) {
    const user = await this.userRepo.findOne({
      where: { phone: dto.phone, role: UserRole.CUSTOMER },
    });
    if (!user)
      throw new NotFoundException("No customer account found for this phone");

    if (user.status === UserStatus.PENDING) {
      throw new UnauthorizedException(
        "Account is need phone verification. Please verify your phone number first.",
      );
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException("Account not active");
    }

    await this.otpService.saveOtp(user.id, OtpPurpose.LOGIN, dto.phone);
    return {
      data: { userId: user.id },
      message: "OTP sent. Check server log.",
    };
  }

  // ─── Delivery login: phone + password → tokens directly ──────────────────────

  async loginDelivery(dto: LoginDeliveryDto) {
    const user = await this.userRepo.findOne({
      where: { phone: dto.phone, role: UserRole.DELIVERY },
    });
    if (!user || !user.passwordHash)
      throw new UnauthorizedException("Invalid credentials");

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException("Invalid credentials");
    if (user.status === UserStatus.PENDING) {
      throw new UnauthorizedException("Please verify your phone number first.");
    }
    if (user.status === UserStatus.BANNED) {
      throw new UnauthorizedException("Account is banned.");
    }
    // SUSPENDED = phone verified, pending manager approval — allow login to complete profile
    // ACTIVE    = fully approved — normal login

    await this.userRepo.update(user.id, { lastLoginAt: new Date() });
    const payload = { sub: user.id, role: user.role, phone: user.phone };
    return {
      data: {
        accessToken: this.jwtService.signAccessToken(payload),
        refreshToken: await this.jwtService.signRefreshToken(payload),
      },
      message: "Login successful",
    };
  }

  // ─── Restaurant Owner ─────────────────────────────────────────────────────────

  async registerRestaurant(dto: RegisterRestaurantDto) {
    const existing = await this.userRepo.findOne({
      where: { phone: dto.phone },
    });
    if (existing) {
      throw new BadRequestException("This phone number is already registered.");
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.userRepo.save(
      this.userRepo.create({
        phone: dto.phone,
        role: UserRole.RESTAURANT_OWNER,
        status: UserStatus.PENDING,
        passwordHash,
      }),
    );
    await this.otpService.saveOtp(user.id, OtpPurpose.PHONE_VERIFY, dto.phone);
    return {
      data: { userId: user.id },
      message: "OTP sent. Check server log for the code.",
    };
  }

  async loginRestaurant(dto: LoginRestaurantDto) {
    const user = await this.userRepo.findOne({
      where: { phone: dto.phone, role: UserRole.RESTAURANT_OWNER },
    });
    if (!user || !user.passwordHash)
      throw new UnauthorizedException("Invalid credentials");

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException("Invalid credentials");
    if (user.status === UserStatus.PENDING) {
      throw new UnauthorizedException("Please verify your phone number first.");
    }
    if (user.status === UserStatus.BANNED) {
      throw new UnauthorizedException("Account is banned.");
    }
    // SUSPENDED = phone verified, pending manager approval — allow login to complete profile
    // ACTIVE    = fully approved — normal login

    await this.userRepo.update(user.id, { lastLoginAt: new Date() });
    const payload = { sub: user.id, role: user.role, phone: user.phone };
    return {
      data: {
        accessToken: this.jwtService.signAccessToken(payload),
        refreshToken: await this.jwtService.signRefreshToken(payload),
      },
      message: "Login successful",
    };
  }

  // ─── Manager login: email + password → tokens directly ───────────────────────

  async loginManager(dto: LoginManagerDto) {
    const user = await this.userRepo.findOne({
      where: { email: dto.email, role: UserRole.MANAGER },
    });
    if (!user) throw new UnauthorizedException("Invalid credentials");

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException("Invalid credentials");
    if (user.status !== UserStatus.ACTIVE)
      throw new UnauthorizedException("Account not active");

    await this.userRepo.update(user.id, { lastLoginAt: new Date() });
    const payload = { sub: user.id, role: user.role, email: user.email };
    return {
      data: {
        accessToken: this.jwtService.signAccessToken(payload),
        refreshToken: await this.jwtService.signRefreshToken(payload),
      },
      message: "Login successful",
    };
  }

  // ─── Resend OTP ───────────────────────────────────────────────────────────────
  // Works for both registration (PENDING) and login (ACTIVE) flows.
  // Purpose is inferred from user status — no extra param needed from the client.
  // Rate-limited by OtpService: max 3 sends per 24-hour window.

  async resendOtp(dto: ResendOtpDto) {
    const user = await this.userRepo.findOne({ where: { id: dto.userId } });
    if (!user) throw new NotFoundException("User not found");

    const otpRoles = [
      UserRole.CUSTOMER,
      UserRole.DELIVERY,
      UserRole.RESTAURANT_OWNER,
    ];
    if (!otpRoles.includes(user.role)) {
      throw new BadRequestException(
        "OTP resend is not applicable for this role",
      );
    }
    if (user.status === UserStatus.BANNED) {
      throw new UnauthorizedException("Account is banned");
    }
    // Delivery / restaurant use phone+password — OTP resend only valid while PENDING
    const passwordRoles = [UserRole.DELIVERY, UserRole.RESTAURANT_OWNER];
    if (
      passwordRoles.includes(user.role) &&
      user.status !== UserStatus.PENDING
    ) {
      throw new BadRequestException(
        "Phone already verified. Use the login endpoint.",
      );
    }

    // CUSTOMER unverified phone → PHONE_VERIFY (registration step)
    // CUSTOMER verified phone  → LOGIN        (login step 2)
    // DELIVERY PENDING         → PHONE_VERIFY (registration)
    const purpose =
      user.role === UserRole.CUSTOMER && user.phoneVerifiedAt !== null
        ? OtpPurpose.LOGIN
        : OtpPurpose.PHONE_VERIFY;

    // Hard-block: if rate limit already maxed, tell them before they even try
    if (!(await this.otpService.canRequestNewCode(user.id, purpose))) {
      throw new BadRequestException(
        "Daily OTP limit reached. You cannot request a new code until the 24-hour window resets.",
      );
    }

    // saveOtp checks for a still-active OTP (would throw "already sent")
    // and enforces the rate limit as a second guard
    await this.otpService.saveOtp(user.id, purpose, user.phone);

    return {
      data: { userId: user.id },
      message: "New OTP sent. Check server log.",
    };
  }

  // OTP second step for customer login
  async verifyLoginOtp(dto: VerifyOtpDto) {
    const user = await this.userRepo.findOne({ where: { id: dto.userId } });
    if (!user) throw new NotFoundException("User not found");
    if (user.role !== UserRole.CUSTOMER) {
      throw new BadRequestException("OTP login only available for customers");
    }
    await this.otpService.verifyOtp(user.id, OtpPurpose.LOGIN, dto.otp);
    await this.userRepo.update(user.id, { lastLoginAt: new Date() });
    const payload = { sub: user.id, role: user.role, phone: user.phone };
    return {
      data: {
        accessToken: this.jwtService.signAccessToken(payload),
        refreshToken: await this.jwtService.signRefreshToken(payload),
      },
      message: "Login successful",
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
      message: "Token refreshed",
    };
  }

  async logout(userId: string, token: string) {
    await this.jwtService.revokeRefreshToken(token);
    return { data: null, message: "Logged out" };
  }
}
