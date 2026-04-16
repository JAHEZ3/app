import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
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
  RegisterRestaurantDto,
} from "./dto/register.dto";
import {
  LoginCustomerDto,
  LoginDeliveryDto,
  LoginManagerDto,
  LoginRestaurantDto,
} from "./dto/login.dto";
import { ResendOtpDto, VerifyOtpDto } from "./dto/verify-otp.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly otpService: OtpService,
    private readonly jwtService: AppJwtService,
    @Inject("NATS_SERVICE")
    private readonly natsClient: ClientProxy,
  ) {}

  // ─── Private helpers ─────────────────────────────────────────────────────────

  private async issuePair(user: User) {
    const payload = {
      sub: user.id,
      role: user.role,
      ...(user.phone && { phone: user.phone }),
      ...(user.email && { email: user.email }),
      profileCompleted: user.profileCompleted,
    };
    return {
      accessToken: this.jwtService.signAccessToken(payload),
      refreshToken: await this.jwtService.signRefreshToken(payload),
    };
  }

  // ─── Registration ─────────────────────────────────────────────────────────────
  //
  // Shared pattern for all phone-based roles:
  //   1. Enter phone → if new: create PENDING user + send OTP
  //                  → if PENDING already: resend OTP
  //                  → if already verified: redirect to login
  //   2. Verify OTP  → SUSPENDED + tokens
  //   3. Complete profile in their own service
  //

  async registerCustomer(dto: RegisterCustomerDto) {
    const existing = await this.userRepo.findOne({
      where: { phone: dto.phone },
    });

    if (existing) {
      if (existing.role !== UserRole.CUSTOMER) {
        throw new ConflictException(
          "Phone is already registered under a different account type.",
        );
      }
      if (existing.status === UserStatus.BANNED) {
        throw new UnauthorizedException("Account is banned. Contact support.");
      }
      if (existing.status === UserStatus.PENDING) {
        await this.otpService.saveOtp(
          existing.id,
          OtpPurpose.PHONE_VERIFY,
          existing.phone,
        );
        return {
          data: { phone: existing.phone },
          message: "Account pending verification. New OTP sent.",
        };
      }
      throw new ConflictException(
        "Phone number already registered. Please use the login endpoint.",
      );
    }

    const user = await this.userRepo.save(
      this.userRepo.create({
        phone: dto.phone,
        role: UserRole.CUSTOMER,
        status: UserStatus.PENDING,
        ...(dto.deviceInfo && { deviceInfo: dto.deviceInfo }),
      }),
    );

    // customer-service creates the profile stub
    this.natsClient.emit("user.customer.created", {
      userId: user.id,
      phone: user.phone,
    });
    await this.otpService.saveOtp(user.id, OtpPurpose.PHONE_VERIFY, user.phone);

    return {
      data: { userId: user.id },
      message: "Account created. OTP sent to verify your phone.",
    };
  }

  async registerDelivery(dto: RegisterDeliveryDto) {
    const existing = await this.userRepo.findOne({
      where: { phone: dto.phone },
    });

    if (existing) {
      if (existing.role !== UserRole.DELIVERY) {
        throw new ConflictException(
          "Phone is already registered under a different role.",
        );
      }
      if (existing.status === UserStatus.BANNED) {
        throw new UnauthorizedException("Account is banned. Contact support.");
      }
      if (existing.status === UserStatus.PENDING) {
        await this.otpService.saveOtp(
          existing.id,
          OtpPurpose.PHONE_VERIFY,
          existing.phone,
        );
        return {
          data: { phone: existing.phone },
          message: "Account pending verification. New OTP sent.",
        };
      }
      throw new ConflictException(
        "Phone number already registered. Please use the login endpoint.",
      );
    }

    const user = await this.userRepo.save(
      this.userRepo.create({
        phone: dto.phone,
        role: UserRole.DELIVERY,
        status: UserStatus.PENDING,
      }),
    );

    await this.otpService.saveOtp(user.id, OtpPurpose.PHONE_VERIFY, user.phone);
    return {
      data: { userId: user.id },
      message: "Account created. OTP sent to verify your phone.",
    };
  }

  async registerRestaurant(dto: RegisterRestaurantDto) {
    const existing = await this.userRepo.findOne({
      where: { phone: dto.phone },
    });

    if (existing) {
      if (existing.role !== UserRole.RESTAURANT_OWNER) {
        throw new ConflictException(
          "Phone is already registered under a different role.",
        );
      }
      if (existing.status === UserStatus.BANNED) {
        throw new UnauthorizedException("Account is banned. Contact support.");
      }
      if (existing.status === UserStatus.PENDING) {
        await this.otpService.saveOtp(
          existing.id,
          OtpPurpose.PHONE_VERIFY,
          existing.phone,
        );
        return {
          data: { phone: existing.phone },
          message: "Account pending verification. New OTP sent.",
        };
      }
      throw new ConflictException(
        "Phone number already registered. Please use the login endpoint.",
      );
    }

    const user = await this.userRepo.save(
      this.userRepo.create({
        phone: dto.phone,
        role: UserRole.RESTAURANT_OWNER,
        status: UserStatus.PENDING,
      }),
    );

    await this.otpService.saveOtp(user.id, OtpPurpose.PHONE_VERIFY, user.phone);
    return {
      data: { userId: user.id },
      message: "Account created. OTP sent to verify your phone.",
    };
  }

  // ─── OTP Verification (registration) ─────────────────────────────────────────
  // PENDING → SUSPENDED for all roles. Tokens are issued immediately so the
  // client can call the downstream service profile-completion endpoint.

  async verifyRegistrationOtp(dto: VerifyOtpDto) {
    const user = await this.userRepo.findOne({ where: { phone: dto.phone } });
    if (!user) throw new NotFoundException("User not found.");
    if (user.role === UserRole.MANAGER) {
      throw new BadRequestException(
        "OTP verification does not apply to manager accounts.",
      );
    }
    if (user.status !== UserStatus.PENDING) {
      throw new BadRequestException(
        "Phone already verified. Please proceed to login.",
      );
    }

    await this.otpService.verifyOtp(user.id, OtpPurpose.PHONE_VERIFY, dto.otp);

    await this.userRepo.update(user.id, {
      phoneVerifiedAt: new Date(),
      status: UserStatus.SUSPENDED,
    });
    user.phoneVerifiedAt = new Date();
    user.status = UserStatus.SUSPENDED;
    user.profileCompleted = false;

    const tokens = await this.issuePair(user);

    const message =
      user.role === UserRole.CUSTOMER
        ? "Phone verified. Please complete your profile at /api/customer/profile."
        : "Phone verified. Please complete your profile and submit your application for admin review.";

    return { data: tokens, message };
  }

  // ─── Resend OTP (registration phase only) ────────────────────────────────────

  async resendOtp(dto: ResendOtpDto) {
    const user = await this.userRepo.findOne({ where: { phone: dto.phone } });
    if (!user) throw new NotFoundException("User not found.");
    if (user.role === UserRole.MANAGER)
      throw new BadRequestException("OTP does not apply to managers.");
    if (user.status === UserStatus.BANNED)
      throw new UnauthorizedException("Account is banned.");
    if (user.status !== UserStatus.PENDING) {
      throw new BadRequestException(
        "Phone already verified. Use the login endpoint.",
      );
    }
    if (
      !(await this.otpService.canRequestNewCode(
        user.id,
        OtpPurpose.PHONE_VERIFY,
      ))
    ) {
      throw new BadRequestException(
        "Daily OTP limit reached. Try again after 24 hours.",
      );
    }
    await this.otpService.saveOtp(user.id, OtpPurpose.PHONE_VERIFY, user.phone);
    return { data: { userId: user.id }, message: "OTP resent." };
  }

  // ─── Customer Login (OTP-based, two-step) ────────────────────────────────────

  async loginCustomer(dto: LoginCustomerDto) {
    const user = await this.userRepo.findOne({
      where: { phone: dto.phone, role: UserRole.CUSTOMER },
    });
    if (!user)
      throw new NotFoundException(
        "No customer account found for this phone number.",
      );

    if (user.status === UserStatus.BANNED)
      throw new UnauthorizedException("Account is banned. Contact support.");
    if (user.status === UserStatus.PENDING) {
      throw new BadRequestException(
        "Phone not verified. Please verify your OTP first.",
      );
    }
    if (user.status === UserStatus.SUSPENDED && user.profileCompleted) {
      throw new UnauthorizedException("Account suspended. Contact support.");
    }

    // ACTIVE → normal login OTP
    // SUSPENDED + !profileCompleted → also send OTP; verifyLoginOtp will issue tokens
    //   so the customer can immediately call POST /api/customer/profile
    await this.otpService.saveOtp(user.id, OtpPurpose.LOGIN, user.phone);
    return {
      data: { phone: user.phone },
      message:
        user.status === UserStatus.SUSPENDED
          ? "OTP sent. Verify to receive your access token and complete your profile."
          : "Login OTP sent to your phone.",
    };
  }

  async verifyLoginOtp(dto: VerifyOtpDto) {
    const user = await this.userRepo.findOne({ where: { phone: dto.phone } });
    if (!user) throw new NotFoundException("User not found.");
    if (user.role !== UserRole.CUSTOMER)
      throw new BadRequestException("OTP login is for customers only.");
    if (user.status === UserStatus.BANNED)
      throw new UnauthorizedException("Account is banned. Contact support.");
    if (user.status === UserStatus.PENDING)
      throw new BadRequestException("Phone not verified.");
    // Allow ACTIVE and SUSPENDED+!profileCompleted — both get tokens.
    // SUSPENDED+profileCompleted means manually suspended by admin.
    if (user.status === UserStatus.SUSPENDED && user.profileCompleted)
      throw new UnauthorizedException("Account suspended. Contact support.");

    await this.otpService.verifyOtp(user.id, OtpPurpose.LOGIN, dto.otp);
    await this.userRepo.update(user.id, { lastLoginAt: new Date() });
    user.lastLoginAt = new Date();
    const tokens = await this.issuePair(user);

    const message =
      user.status === UserStatus.SUSPENDED
        ? "OTP verified. Please complete your profile at /api/customer/profile."
        : "Login successful.";

    return { data: tokens, message };
  }

  // ─── Delivery Login (phone + password) ───────────────────────────────────────

  async loginDelivery(dto: LoginDeliveryDto) {
    const user = await this.userRepo.findOne({
      where: { phone: dto.phone, role: UserRole.DELIVERY },
    });
    if (!user) throw new UnauthorizedException("Invalid credentials.");

    if (user.status === UserStatus.BANNED)
      throw new UnauthorizedException("Account is banned. Contact support.");
    if (user.status === UserStatus.PENDING)
      throw new BadRequestException("Please verify your phone first.");

    // No password means profile was never completed (password is set during completeProfile).
    // Guide them to re-register to get a fresh access token.
    if (!user.passwordHash) {
      throw new BadRequestException(
        "No password set yet. Call POST /api/auth/register/delivery with your phone to receive an access token and complete your profile.",
      );
    }

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException("Invalid credentials.");

    if (user.status === UserStatus.SUSPENDED) {
      await this.userRepo.update(user.id, { lastLoginAt: new Date() });
      user.lastLoginAt = new Date();
      const tokens = await this.issuePair(user);
      if (!user.profileCompleted) {
        // Password was set via forgot-password but profile not yet submitted.
        // Return tokens so they can reach the profile-completion endpoint.
        return {
          data: tokens,
          message:
            "Login successful. Please complete your profile at /api/delivery/profile/complete.",
        };
      }
      // Profile submitted — awaiting admin approval.
      return {
        data: tokens,
        message: "Login successful. Your account is pending admin approval.",
      };
    }

    await this.userRepo.update(user.id, { lastLoginAt: new Date() });
    user.lastLoginAt = new Date();
    const tokens = await this.issuePair(user);
    return { data: tokens, message: "Login successful." };
  }

  // ─── Restaurant Login (phone + password) ─────────────────────────────────────

  async loginRestaurant(dto: LoginRestaurantDto) {
    const user = await this.userRepo.findOne({
      where: { phone: dto.phone, role: UserRole.RESTAURANT_OWNER },
    });
    if (!user) throw new UnauthorizedException("Invalid credentials.");

    if (user.status === UserStatus.BANNED)
      throw new UnauthorizedException("Account is banned. Contact support.");
    if (user.status === UserStatus.PENDING)
      throw new BadRequestException("Please verify your phone first.");

    // No password means profile was never completed.
    if (!user.passwordHash) {
      throw new BadRequestException(
        "No password set yet. Call POST /api/auth/register/restaurant with your phone to receive an access token and complete your profile.",
      );
    }

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException("Invalid credentials.");

    if (user.status === UserStatus.SUSPENDED) {
      await this.userRepo.update(user.id, { lastLoginAt: new Date() });
      user.lastLoginAt = new Date();
      const tokens = await this.issuePair(user);
      if (!user.profileCompleted) {
        return {
          data: tokens,
          message:
            "Login successful. Please complete your profile at /api/restaurant/profile.",
        };
      }
      return {
        data: tokens,
        message: "Login successful. Your account is pending admin approval.",
      };
    }

    await this.userRepo.update(user.id, { lastLoginAt: new Date() });
    user.lastLoginAt = new Date();
    const tokens = await this.issuePair(user);
    return { data: tokens, message: "Login successful." };
  }

  // ─── Manager Login (email + password) ────────────────────────────────────────

  async loginManager(dto: LoginManagerDto) {
    const user = await this.userRepo.findOne({
      where: { email: dto.email, role: UserRole.MANAGER },
    });
    if (!user || !user.passwordHash)
      throw new UnauthorizedException("Invalid credentials.");

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException("Invalid credentials.");

    if (user.status !== UserStatus.ACTIVE)
      throw new UnauthorizedException("Manager account is not active.");

    await this.userRepo.update(user.id, { lastLoginAt: new Date() });
    user.lastLoginAt = new Date();
    const tokens = await this.issuePair(user);
    return { data: tokens, message: "Login successful." };
  }

  // ─── Password Management ──────────────────────────────────────────────────────

  async forgotPassword(dto: ForgotPasswordDto) {
    if (!dto.phone && !dto.email)
      throw new BadRequestException("Provide phone or email.");

    const user = dto.phone
      ? await this.userRepo.findOne({ where: { phone: dto.phone } })
      : await this.userRepo.findOne({ where: { email: dto.email } });

    if (!user)
      throw new NotFoundException("No account found with that contact.");
    if (user.role === UserRole.CUSTOMER)
      throw new BadRequestException(
        "Customers use OTP-based login and have no password.",
      );
    if (user.status === UserStatus.BANNED)
      throw new UnauthorizedException("Account is banned.");
    if (user.status === UserStatus.PENDING)
      throw new BadRequestException("Verify your phone first.");

    const identifier = user.phone ?? user.email;
    await this.otpService.saveOtp(
      user.id,
      OtpPurpose.PASSWORD_RESET,
      identifier,
    );
    return { data: { userId: user.id }, message: "Password reset OTP sent." };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.userRepo.findOne({ where: { id: dto.userId } });
    if (!user) throw new NotFoundException("User not found.");
    if (user.role === UserRole.CUSTOMER)
      throw new BadRequestException("Customers have no password.");

    await this.otpService.verifyOtp(
      user.id,
      OtpPurpose.PASSWORD_RESET,
      dto.otp,
    );

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.userRepo.update(user.id, { passwordHash });
    await this.jwtService.revokeAllUserTokens(user.id);

    return {
      data: null,
      message: "Password reset successfully. Please log in again.",
    };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException("User not found.");
    if (user.role === UserRole.CUSTOMER)
      throw new BadRequestException("Customers have no password.");
    if (!user.passwordHash)
      throw new BadRequestException(
        "No password set. Use forgot-password flow.",
      );

    const ok = await bcrypt.compare(dto.oldPassword, user.passwordHash);
    if (!ok) throw new BadRequestException("Current password is incorrect.");
    if (dto.oldPassword === dto.newPassword)
      throw new BadRequestException("New password must differ from current.");

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.userRepo.update(userId, { passwordHash });
    return { data: null, message: "Password changed successfully." };
  }

  // ─── Token Management ──────────────────────────────────────────────────────────

  async refresh(token: string) {
    const payload = await this.jwtService.verifyRefreshToken(token);

    const user = await this.userRepo.findOne({ where: { id: payload.sub } });
    if (!user) throw new UnauthorizedException("User not found.");
    if (user.status === UserStatus.BANNED)
      throw new UnauthorizedException("Account is banned.");

    const newPayload = {
      sub: user.id,
      role: user.role,
      ...(user.phone && { phone: user.phone }),
      ...(user.email && { email: user.email }),
      profileCompleted: user.profileCompleted,
    };
    return {
      data: { accessToken: this.jwtService.signAccessToken(newPayload) },
      message: "Token refreshed.",
    };
  }

  async logout(userId: string, token: string) {
    await this.jwtService.revokeRefreshToken(token);
    return { data: null, message: "Logged out successfully." };
  }

  // ─── NATS Event Handlers — user status transitions ────────────────────────────
  // Called from auth.controller.ts @EventPattern handlers.
  // Each service emits an event when something meaningful happens; auth-service
  // updates the users table accordingly (single source of truth for auth state).

  /** customer-service emits this after customer saves their profile. */
  async onCustomerProfileCompleted(data: { userId: string }) {
    await this.userRepo.update(
      { id: data.userId, role: UserRole.CUSTOMER },
      { profileCompleted: true, status: UserStatus.ACTIVE },
    );
    this.logger.log(`Customer ${data.userId} profile completed → ACTIVE`);
  }

  /** delivery-service emits this after agent submits their application. */
  async onDeliveryProfileCompleted(data: { userId: string }) {
    await this.userRepo.update(
      { id: data.userId, role: UserRole.DELIVERY },
      { profileCompleted: true },
    );
    this.logger.log(`Delivery agent ${data.userId} profile submitted`);
  }

  /** delivery-service emits this after manager approves an application. */
  async onDeliveryAgentApproved(data: { userId: string }) {
    await this.userRepo.update(
      { id: data.userId, role: UserRole.DELIVERY },
      { status: UserStatus.ACTIVE },
    );
    this.logger.log(`Delivery agent ${data.userId} approved → ACTIVE`);
  }

  /** delivery-service emits this after manager rejects an application. */
  async onDeliveryAgentRejected(data: { userId: string }) {
    // Reset profileCompleted so the agent can resubmit a corrected application.
    await this.userRepo.update(
      { id: data.userId, role: UserRole.DELIVERY },
      { profileCompleted: false },
    );
    this.logger.log(
      `Delivery agent ${data.userId} rejected → profileCompleted reset`,
    );
  }

  /** restaurant-service emits this after owner saves their restaurant profile. */
  async onRestaurantProfileCompleted(data: { userId: string }) {
    await this.userRepo.update(
      { id: data.userId, role: UserRole.RESTAURANT_OWNER },
      { profileCompleted: true },
    );
    this.logger.log(`Restaurant owner ${data.userId} profile submitted`);
  }

  /** restaurant-service emits this after manager approves the restaurant. */
  async onRestaurantOwnerApproved(data: { userId: string }) {
    await this.userRepo.update(
      { id: data.userId, role: UserRole.RESTAURANT_OWNER },
      { status: UserStatus.ACTIVE },
    );
    this.logger.log(`Restaurant owner ${data.userId} approved → ACTIVE`);
  }

  /** restaurant-service emits this after manager rejects the restaurant. */
  async onRestaurantOwnerRejected(data: { userId: string }) {
    await this.userRepo.update(
      { id: data.userId, role: UserRole.RESTAURANT_OWNER },
      { profileCompleted: false },
    );
    this.logger.log(
      `Restaurant owner ${data.userId} rejected → profileCompleted reset`,
    );
  }

  /** delivery-service or restaurant-service set a password on behalf of user. */
  async onPasswordSet(data: { userId: string; passwordHash: string }) {
    await this.userRepo.update(
      { id: data.userId },
      { passwordHash: data.passwordHash },
    );
    this.logger.log(`Password set for user ${data.userId}`);
  }
}
