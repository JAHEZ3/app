import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";
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
    @Inject(CACHE_MANAGER)
    private readonly cache: Cache,
  ) {}

  // ─── Private helpers ─────────────────────────────────────────────────────────

  private loginAttemptKey(identifier: string): string {
    return `login_fail:${identifier}`;
  }

  private async checkLoginRateLimit(identifier: string): Promise<void> {
    try {
      const record = await this.cache.get<{ count: number; lockedUntil?: number }>(
        this.loginAttemptKey(identifier),
      );
      if (record?.lockedUntil && Date.now() < record.lockedUntil) {
        const minutesLeft = Math.ceil((record.lockedUntil - Date.now()) / 60_000);
        throw new UnauthorizedException(
          `محاولات فاشلة كثيرة. حاول مجدداً بعد ${minutesLeft} دقيقة.`,
        );
      }
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      this.logger.error('Redis error in checkLoginRateLimit — allowing request', err);
    }
  }

  private async recordFailedLogin(identifier: string): Promise<void> {
    try {
      const key = this.loginAttemptKey(identifier);
      const record = await this.cache.get<{ count: number; lockedUntil?: number }>(key) ?? { count: 0 };
      const count = record.count + 1;
      const LOCK_MS = 15 * 60 * 1000;
      if (count >= 5) {
        await this.cache.set(key, { count, lockedUntil: Date.now() + LOCK_MS }, LOCK_MS);
      } else {
        await this.cache.set(key, { count }, LOCK_MS);
      }
    } catch (err) {
      this.logger.error('Redis error in recordFailedLogin — skipping rate-limit record', err);
    }
  }

  private async clearLoginAttempts(identifier: string): Promise<void> {
    try {
      await this.cache.del(this.loginAttemptKey(identifier));
    } catch (err) {
      this.logger.error('Redis error in clearLoginAttempts — skipping', err);
    }
  }

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
          "رقم الهاتف مسجل بالفعل لنوع حساب مختلف.",
        );
      }
      if (existing.status === UserStatus.BANNED) {
        throw new UnauthorizedException("الحساب محظور. تواصل مع الدعم.");
      }
      if (existing.status === UserStatus.PENDING) {
        await this.otpService.saveOtp(
          existing.id,
          OtpPurpose.PHONE_VERIFY,
          existing.phone,
        );
        return {
          data: { phone: existing.phone },
          message: "الحساب قيد التحقق. تم إرسال رمز جديد.",
        };
      }
      throw new ConflictException(
        "رقم الهاتف مسجل بالفعل. يرجى تسجيل الدخول.",
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
    try {
      this.natsClient.emit("user.customer.created", { userId: user.id, phone: user.phone });
    } catch (err) {
      this.logger.error("NATS emit user.customer.created failed", err);
    }
    await this.otpService.saveOtp(user.id, OtpPurpose.PHONE_VERIFY, user.phone);

    return {
      data: { phone: user.phone },
      message: "تم إنشاء الحساب. تم إرسال رمز التحقق إلى هاتفك.",
    };
  }

  async registerDelivery(dto: RegisterDeliveryDto) {
    const existing = await this.userRepo.findOne({
      where: { phone: dto.phone },
    });

    if (existing) {
      if (existing.role !== UserRole.DELIVERY) {
        throw new ConflictException(
          "رقم الهاتف مسجل بالفعل تحت دور مختلف.",
        );
      }
      if (existing.status === UserStatus.BANNED) {
        throw new UnauthorizedException("الحساب محظور. تواصل مع الدعم.");
      }
      if (existing.status === UserStatus.PENDING) {
        await this.otpService.saveOtp(
          existing.id,
          OtpPurpose.PHONE_VERIFY,
          existing.phone,
        );
        return {
          data: { phone: existing.phone },
          message: "الحساب قيد التحقق. تم إرسال رمز جديد.",
        };
      }
      throw new ConflictException(
        "رقم الهاتف مسجل بالفعل. يرجى تسجيل الدخول.",
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
      data: { phone: user.phone },
      message: "تم إنشاء الحساب. تم إرسال رمز التحقق إلى هاتفك.",
    };
  }

  async registerRestaurant(dto: RegisterRestaurantDto) {
    const existing = await this.userRepo.findOne({
      where: { phone: dto.phone },
    });

    if (existing) {
      if (existing.role !== UserRole.RESTAURANT_OWNER) {
        throw new ConflictException(
          "رقم الهاتف مسجل بالفعل تحت دور مختلف.",
        );
      }
      if (existing.status === UserStatus.BANNED) {
        throw new UnauthorizedException("الحساب محظور. تواصل مع الدعم.");
      }
      if (existing.status === UserStatus.PENDING) {
        // Re-emit in case restaurant-service missed it the first time (NATS down)
        try {
          this.natsClient.emit("user.restaurant.created", { userId: existing.id, phone: existing.phone });
        } catch (err) {
          this.logger.error("NATS emit user.restaurant.created (re-emit) failed", err);
        }
        await this.otpService.saveOtp(
          existing.id,
          OtpPurpose.PHONE_VERIFY,
          existing.phone,
        );
        return {
          data: { phone: existing.phone },
          message: "الحساب قيد التحقق. تم إرسال رمز جديد.",
        };
      }
      throw new ConflictException(
        "رقم الهاتف مسجل بالفعل. يرجى تسجيل الدخول.",
      );
    }

    const user = await this.userRepo.save(
      this.userRepo.create({
        phone: dto.phone,
        role: UserRole.RESTAURANT_OWNER,
        status: UserStatus.PENDING,
      }),
    );

    // restaurant-service creates the profile stub on this event
    try {
      this.natsClient.emit("user.restaurant.created", { userId: user.id, phone: user.phone });
    } catch (err) {
      this.logger.error("NATS emit user.restaurant.created failed", err);
    }

    await this.otpService.saveOtp(user.id, OtpPurpose.PHONE_VERIFY, user.phone);
    return {
      data: { phone: user.phone },
      message: "تم إنشاء الحساب. تم إرسال رمز التحقق إلى هاتفك.",
    };
  }

  // ─── OTP Verification (registration) ─────────────────────────────────────────
  // PENDING → SUSPENDED for all roles. Tokens are issued immediately so the
  // client can call the downstream service profile-completion endpoint.

  async verifyRegistrationOtp(dto: VerifyOtpDto) {
    const user = await this.userRepo.findOne({ where: { phone: dto.phone } });
    if (!user) throw new NotFoundException("المستخدم غير موجود.");
    if (user.role === UserRole.MANAGER) {
      throw new BadRequestException(
        "التحقق برمز OTP لا ينطبق على حسابات المديرين.",
      );
    }
    if (user.status !== UserStatus.PENDING) {
      throw new BadRequestException(
        "تم التحقق من رقم الهاتف. يرجى تسجيل الدخول.",
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
        ? "تم التحقق من هاتفك. أكمل ملفك الشخصي."
        : "تم التحقق من هاتفك. أكمل ملفك الشخصي وقدّم طلبك للمراجعة.";

    return { data: tokens, message };
  }

  // ─── Resend OTP (registration phase only) ────────────────────────────────────

  async resendOtp(dto: ResendOtpDto) {
    const user = await this.userRepo.findOne({ where: { phone: dto.phone } });
    if (!user) throw new NotFoundException("المستخدم غير موجود.");
    if (user.role === UserRole.MANAGER)
      throw new BadRequestException("رمز OTP لا ينطبق على المديرين.");
    if (user.status === UserStatus.BANNED)
      throw new UnauthorizedException("الحساب محظور.");
    if (user.status !== UserStatus.PENDING) {
      throw new BadRequestException(
        "تم التحقق من رقم الهاتف. استخدم تسجيل الدخول.",
      );
    }
    if (
      !(await this.otpService.canRequestNewCode(
        user.id,
        OtpPurpose.PHONE_VERIFY,
      ))
    ) {
      throw new BadRequestException(
        "تم بلوغ الحد اليومي لرمز التحقق. حاول مجدداً بعد 24 ساعة.",
      );
    }
    await this.otpService.saveOtp(user.id, OtpPurpose.PHONE_VERIFY, user.phone);
    return { data: { phone: user.phone }, message: "تم إعادة إرسال رمز التحقق." };
  }

  // ─── Customer Login (OTP-based, two-step) ────────────────────────────────────

  async loginCustomer(dto: LoginCustomerDto) {
    const user = await this.userRepo.findOne({
      where: { phone: dto.phone, role: UserRole.CUSTOMER },
    });
    if (!user)
      throw new NotFoundException(
        "لا يوجد حساب عميل لهذا الرقم.",
      );

    if (user.status === UserStatus.BANNED)
      throw new UnauthorizedException("الحساب محظور. تواصل مع الدعم.");
    if (user.status === UserStatus.PENDING) {
      throw new BadRequestException(
        "رقم الهاتف غير مُحقَّق. يرجى التحقق من رمز OTP أولاً.",
      );
    }
    if (user.status === UserStatus.SUSPENDED && user.profileCompleted) {
      throw new UnauthorizedException("الحساب موقوف. تواصل مع الدعم.");
    }

    // ACTIVE → normal login OTP
    // SUSPENDED + !profileCompleted → also send OTP; verifyLoginOtp will issue tokens
    //   so the customer can immediately call POST /api/customer/profile
    await this.otpService.saveOtp(user.id, OtpPurpose.LOGIN, user.phone);
    return {
      data: { phone: user.phone },
      message:
        user.status === UserStatus.SUSPENDED
          ? "تم إرسال رمز التحقق. تحقق منه للحصول على رمز الوصول وإكمال ملفك."
          : "تم إرسال رمز تسجيل الدخول إلى هاتفك.",
    };
  }

  async verifyLoginOtp(dto: VerifyOtpDto) {
    const user = await this.userRepo.findOne({ where: { phone: dto.phone } });
    if (!user) throw new NotFoundException("المستخدم غير موجود.");
    if (user.role !== UserRole.CUSTOMER)
      throw new BadRequestException("تسجيل الدخول برمز OTP متاح للعملاء فقط.");
    if (user.status === UserStatus.BANNED)
      throw new UnauthorizedException("الحساب محظور. تواصل مع الدعم.");
    if (user.status === UserStatus.PENDING)
      throw new BadRequestException("رقم الهاتف غير مُحقَّق.");
    // Allow ACTIVE and SUSPENDED+!profileCompleted — both get tokens.
    // SUSPENDED+profileCompleted means manually suspended by admin.
    if (user.status === UserStatus.SUSPENDED && user.profileCompleted)
      throw new UnauthorizedException("الحساب موقوف. تواصل مع الدعم.");

    await this.otpService.verifyOtp(user.id, OtpPurpose.LOGIN, dto.otp);
    await this.userRepo.update(user.id, { lastLoginAt: new Date() });
    user.lastLoginAt = new Date();
    const tokens = await this.issuePair(user);

    const message =
      user.status === UserStatus.SUSPENDED
        ? "تم التحقق من الرمز. يرجى إكمال ملفك الشخصي."
        : "تم تسجيل الدخول بنجاح.";

    return { data: tokens, message };
  }

  // ─── Delivery Login (phone + password) ───────────────────────────────────────

  async loginDelivery(dto: LoginDeliveryDto) {
    await this.checkLoginRateLimit(dto.phone);

    const user = await this.userRepo.findOne({
      where: { phone: dto.phone, role: UserRole.DELIVERY },
    });
    if (!user) {
      await this.recordFailedLogin(dto.phone);
      throw new UnauthorizedException("بيانات الدخول غير صحيحة.");
    }

    if (user.status === UserStatus.BANNED)
      throw new UnauthorizedException("الحساب محظور. تواصل مع الدعم.");
    if (user.status === UserStatus.PENDING)
      throw new BadRequestException("يرجى التحقق من رقم هاتفك أولاً.");

    // No password means profile was never completed (password is set during completeProfile).
    // Guide them to re-register to get a fresh access token.
    if (!user.passwordHash) {
      throw new BadRequestException(
        "لم يتم تعيين كلمة مرور. سجّل من جديد لاستلام رمز الوصول وإكمال ملفك.",
      );
    }

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      await this.recordFailedLogin(dto.phone);
      throw new UnauthorizedException("بيانات الدخول غير صحيحة.");
    }

    await this.clearLoginAttempts(dto.phone);

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
            "تم تسجيل الدخول. أكمل ملفك الشخصي.",
        };
      }
      // Profile submitted — awaiting admin approval.
      return {
        data: tokens,
        message: "تم تسجيل الدخول. حسابك قيد موافقة الإدارة.",
      };
    }

    await this.userRepo.update(user.id, { lastLoginAt: new Date() });
    user.lastLoginAt = new Date();
    const tokens = await this.issuePair(user);
    return { data: tokens, message: "تم تسجيل الدخول بنجاح." };
  }

  // ─── Restaurant Login (phone + password) ─────────────────────────────────────

  async loginRestaurant(dto: LoginRestaurantDto) {
    await this.checkLoginRateLimit(dto.phone);

    const user = await this.userRepo.findOne({
      where: { phone: dto.phone, role: UserRole.RESTAURANT_OWNER },
    });
    if (!user) {
      await this.recordFailedLogin(dto.phone);
      throw new UnauthorizedException("بيانات الدخول غير صحيحة.");
    }

    if (user.status === UserStatus.BANNED)
      throw new UnauthorizedException("الحساب محظور. تواصل مع الدعم.");
    if (user.status === UserStatus.PENDING)
      throw new BadRequestException("يرجى التحقق من رقم هاتفك أولاً.");

    // No password means profile was never completed.
    if (!user.passwordHash) {
      throw new BadRequestException(
        "لم يتم تعيين كلمة مرور. سجّل من جديد لاستلام رمز الوصول وإكمال ملفك.",
      );
    }

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      await this.recordFailedLogin(dto.phone);
      throw new UnauthorizedException("بيانات الدخول غير صحيحة.");
    }

    await this.clearLoginAttempts(dto.phone);

    if (user.status === UserStatus.SUSPENDED) {
      await this.userRepo.update(user.id, { lastLoginAt: new Date() });
      user.lastLoginAt = new Date();
      const tokens = await this.issuePair(user);
      if (!user.profileCompleted) {
        return {
          data: tokens,
          message:
            "تم تسجيل الدخول. أكمل ملفك الشخصي.",
        };
      }
      return {
        data: tokens,
        message: "تم تسجيل الدخول. حسابك قيد موافقة الإدارة.",
      };
    }

    await this.userRepo.update(user.id, { lastLoginAt: new Date() });
    user.lastLoginAt = new Date();
    const tokens = await this.issuePair(user);
    return { data: tokens, message: "تم تسجيل الدخول بنجاح." };
  }

  // ─── Manager Login (email + password) ────────────────────────────────────────

  async loginManager(dto: LoginManagerDto) {
    await this.checkLoginRateLimit(dto.email);

    const user = await this.userRepo.findOne({
      where: { email: dto.email, role: UserRole.MANAGER },
    });
    if (!user || !user.passwordHash) {
      await this.recordFailedLogin(dto.email);
      throw new UnauthorizedException("بيانات الدخول غير صحيحة.");
    }

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      await this.recordFailedLogin(dto.email);
      throw new UnauthorizedException("بيانات الدخول غير صحيحة.");
    }

    if (user.status !== UserStatus.ACTIVE)
      throw new UnauthorizedException("حساب المدير غير نشط.");

    await this.clearLoginAttempts(dto.email);
    await this.userRepo.update(user.id, { lastLoginAt: new Date() });
    user.lastLoginAt = new Date();
    const tokens = await this.issuePair(user);
    return { data: tokens, message: "تم تسجيل الدخول بنجاح." };
  }

  // ─── Password Management ──────────────────────────────────────────────────────

  async forgotPassword(dto: ForgotPasswordDto) {
    if (!dto.phone && !dto.email)
      throw new BadRequestException("يرجى إدخال رقم الهاتف أو البريد الإلكتروني.");

    const user = dto.phone
      ? await this.userRepo.findOne({ where: { phone: dto.phone } })
      : await this.userRepo.findOne({ where: { email: dto.email } });

    if (!user)
      throw new NotFoundException("لا يوجد حساب لهذا الاتصال.");
    if (user.role === UserRole.CUSTOMER)
      throw new BadRequestException(
        "العملاء يسجلون الدخول برمز OTP وليس لديهم كلمة مرور.",
      );
    if (user.status === UserStatus.BANNED)
      throw new UnauthorizedException("الحساب محظور.");
    if (user.status === UserStatus.PENDING)
      throw new BadRequestException("تحقق من رقم هاتفك أولاً.");

    const identifier = user.phone ?? user.email;
    await this.otpService.saveOtp(
      user.id,
      OtpPurpose.PASSWORD_RESET,
      identifier,
    );
    return { data: null, message: "تم إرسال رمز إعادة تعيين كلمة المرور." };
  }

  async resetPassword(dto: ResetPasswordDto) {
    if (!dto.phone && !dto.email)
      throw new BadRequestException("يرجى إدخال رقم الهاتف أو البريد الإلكتروني.");

    const user = dto.phone
      ? await this.userRepo.findOne({ where: { phone: dto.phone } })
      : await this.userRepo.findOne({ where: { email: dto.email } });

    if (!user) throw new NotFoundException("المستخدم غير موجود.");
    if (user.role === UserRole.CUSTOMER)
      throw new BadRequestException("العملاء لا يملكون كلمة مرور.");

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
      message: "تمت إعادة تعيين كلمة المرور بنجاح. سجّل الدخول مجدداً.",
    };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException("المستخدم غير موجود.");
    if (user.role === UserRole.CUSTOMER)
      throw new BadRequestException("العملاء لا يملكون كلمة مرور.");
    if (!user.passwordHash)
      throw new BadRequestException(
        "لم يتم تعيين كلمة مرور. استخدم خاصية نسيت كلمة المرور.",
      );

    const ok = await bcrypt.compare(dto.oldPassword, user.passwordHash);
    if (!ok) throw new BadRequestException("كلمة المرور الحالية غير صحيحة.");
    if (dto.oldPassword === dto.newPassword)
      throw new BadRequestException("يجب أن تختلف كلمة المرور الجديدة عن الحالية.");

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.userRepo.update(userId, { passwordHash });
    await this.jwtService.revokeAllUserTokens(userId);
    return { data: null, message: "تم تغيير كلمة المرور بنجاح. سجّل الدخول مجدداً." };
  }

  // ─── Token Management ──────────────────────────────────────────────────────────

  async refresh(token: string) {
    const payload = await this.jwtService.verifyRefreshToken(token);

    const user = await this.userRepo.findOne({ where: { id: payload.sub } });
    if (!user) throw new UnauthorizedException("المستخدم غير موجود.");
    if (user.status === UserStatus.BANNED)
      throw new UnauthorizedException("الحساب محظور.");

    // Revoke the old refresh token before issuing a new pair (rotation)
    await this.jwtService.revokeRefreshToken(token);

    const tokens = await this.issuePair(user);
    return { data: tokens, message: "تم تجديد الرمز." };
  }

  async logout(_userId: string, token: string) {
    await this.jwtService.revokeRefreshToken(token);
    return { data: null, message: "تم تسجيل الخروج بنجاح." };
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
    const user = await this.userRepo.findOne({ where: { id: data.userId } });
    if (!user || user.role !== UserRole.DELIVERY) {
      this.logger.warn(`onDeliveryAgentApproved: invalid userId or role for ${data.userId}`);
      return;
    }
    await this.userRepo.update({ id: data.userId }, { status: UserStatus.ACTIVE });
    this.logger.log(`Delivery agent ${data.userId} approved → ACTIVE`);
  }

  /** delivery-service emits this after manager rejects an application. */
  async onDeliveryAgentRejected(data: { userId: string }) {
    const user = await this.userRepo.findOne({ where: { id: data.userId } });
    if (!user || user.role !== UserRole.DELIVERY) {
      this.logger.warn(`onDeliveryAgentRejected: invalid userId or role for ${data.userId}`);
      return;
    }
    await this.userRepo.update({ id: data.userId }, { profileCompleted: false });
    this.logger.log(`Delivery agent ${data.userId} rejected → profileCompleted reset`);
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
    const user = await this.userRepo.findOne({ where: { id: data.userId } });
    if (!user || user.role !== UserRole.RESTAURANT_OWNER) {
      this.logger.warn(`onRestaurantOwnerApproved: invalid userId or role for ${data.userId}`);
      return;
    }
    await this.userRepo.update({ id: data.userId }, { status: UserStatus.ACTIVE });
    this.logger.log(`Restaurant owner ${data.userId} approved → ACTIVE`);
  }

  /** restaurant-service emits this after manager rejects the restaurant. */
  async onRestaurantOwnerRejected(data: { userId: string }) {
    const user = await this.userRepo.findOne({ where: { id: data.userId } });
    if (!user || user.role !== UserRole.RESTAURANT_OWNER) {
      this.logger.warn(`onRestaurantOwnerRejected: invalid userId or role for ${data.userId}`);
      return;
    }
    await this.userRepo.update({ id: data.userId }, { profileCompleted: false });
    this.logger.log(`Restaurant owner ${data.userId} rejected → profileCompleted reset`);
  }

  /** delivery-service or restaurant-service set a password on behalf of user. */
  async onPasswordSet(data: { userId: string; password: string }) {
    const passwordHash = await bcrypt.hash(data.password, 10);
    await this.userRepo.update({ id: data.userId }, { passwordHash });
    this.logger.log(`Password set for user ${data.userId}`);
  }
}
