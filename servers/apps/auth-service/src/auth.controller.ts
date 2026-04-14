import { Body, Controller, Delete, Post, UseGuards } from "@nestjs/common";
import { EventPattern, Payload } from "@nestjs/microservices";
import { AuthService } from "./auth.service";
import {
  RegisterCustomerDto,
  RegisterDeliveryDto,
  RegisterRestaurantDto,
} from "./dto/register.dto";
import { ResendOtpDto, VerifyOtpDto } from "./dto/verify-otp.dto";
import {
  LoginCustomerDto,
  LoginDeliveryDto,
  LoginManagerDto,
  LoginRestaurantDto,
} from "./dto/login.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { CurrentUser } from "./decorators/current-user.decorator";

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // REGISTRATION  —  Step 1: phone → OTP (status: PENDING)
  // ═══════════════════════════════════════════════════════════════════════════

  @Post("customer/register")
  registerCustomer(@Body() dto: RegisterCustomerDto) {
    return this.authService.registerCustomer(dto);
  }

  @Post("delivery/register")
  registerDelivery(@Body() dto: RegisterDeliveryDto) {
    return this.authService.registerDelivery(dto);
  }

  @Post("restaurant/register")
  registerRestaurant(@Body() dto: RegisterRestaurantDto) {
    return this.authService.registerRestaurant(dto);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // REGISTRATION  —  Step 2: verify OTP (status: SUSPENDED + tokens issued)
  // ═══════════════════════════════════════════════════════════════════════════

  /** Verifies the PHONE_VERIFY OTP for any phone-based role. */
  @Post("verify-otp")
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyRegistrationOtp(dto);
  }

  /** Resends PHONE_VERIFY OTP (max 3 / 24 h). */
  @Post("resend-otp")
  resendOtp(@Body() dto: ResendOtpDto) {
    return this.authService.resendOtp(dto);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LOGIN
  // ═══════════════════════════════════════════════════════════════════════════

  /** Step 1 of customer OTP login — sends a LOGIN OTP. */
  @Post("customer/login")
  loginCustomer(@Body() dto: LoginCustomerDto) {
    return this.authService.loginCustomer(dto);
  }

  /** Step 2 of customer OTP login — verifies OTP and returns tokens. */
  @Post("customer/verify-login")
  verifyLoginOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyLoginOtp(dto);
  }

  @Post("delivery/login")
  loginDelivery(@Body() dto: LoginDeliveryDto) {
    return this.authService.loginDelivery(dto);
  }

  @Post("restaurant/login")
  loginRestaurant(@Body() dto: LoginRestaurantDto) {
    return this.authService.loginRestaurant(dto);
  }

  @Post("manager/login")
  loginManager(@Body() dto: LoginManagerDto) {
    return this.authService.loginManager(dto);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PASSWORD MANAGEMENT  (delivery / restaurant / manager only)
  // ═══════════════════════════════════════════════════════════════════════════

  @Post("forgot-password")
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post("reset-password")
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post("change-password")
  @UseGuards(JwtAuthGuard)
  changePassword(
    @CurrentUser("sub") userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(userId, dto);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TOKEN MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════

  @Post("refresh")
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Delete("logout")
  @UseGuards(JwtAuthGuard)
  logout(@CurrentUser("sub") userId: string, @Body() dto: RefreshTokenDto) {
    return this.authService.logout(userId, dto.refreshToken);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // NATS EVENT HANDLERS
  // Each downstream service emits an event when something meaningful happens.
  // Auth-service listens and updates the users table (single source of truth).
  // ═══════════════════════════════════════════════════════════════════════════

  /** customer-service → profile saved → user ACTIVE */
  @EventPattern("customer.profile.completed")
  onCustomerProfileCompleted(@Payload() data: { userId: string }) {
    return this.authService.onCustomerProfileCompleted(data);
  }

  /** delivery-service → agent submitted application → profileCompleted = true */
  @EventPattern("delivery.profile.completed")
  onDeliveryProfileCompleted(@Payload() data: { userId: string }) {
    return this.authService.onDeliveryProfileCompleted(data);
  }

  /** delivery-service → manager approved agent → user ACTIVE */
  @EventPattern("delivery.agent.approved")
  onDeliveryAgentApproved(@Payload() data: { userId: string }) {
    return this.authService.onDeliveryAgentApproved(data);
  }

  /** delivery-service → manager rejected agent → profileCompleted reset */
  @EventPattern("delivery.agent.rejected")
  onDeliveryAgentRejected(@Payload() data: { userId: string }) {
    return this.authService.onDeliveryAgentRejected(data);
  }

  /** restaurant-service → owner saved profile → profileCompleted = true */
  @EventPattern("restaurant.profile.completed")
  onRestaurantProfileCompleted(@Payload() data: { userId: string }) {
    return this.authService.onRestaurantProfileCompleted(data);
  }

  /** restaurant-service → manager approved restaurant → user ACTIVE */
  @EventPattern("restaurant.owner.approved")
  onRestaurantOwnerApproved(@Payload() data: { userId: string }) {
    return this.authService.onRestaurantOwnerApproved(data);
  }

  /** restaurant-service → manager rejected restaurant → profileCompleted reset */
  @EventPattern("restaurant.owner.rejected")
  onRestaurantOwnerRejected(@Payload() data: { userId: string }) {
    return this.authService.onRestaurantOwnerRejected(data);
  }

  /** delivery-service or restaurant-service → password set for user */
  @EventPattern("user.password.set")
  onPasswordSet(@Payload() data: { userId: string; passwordHash: string }) {
    return this.authService.onPasswordSet(data);
  }
}
