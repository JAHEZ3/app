import { Body, Controller, Delete, Post, UseGuards } from "@nestjs/common";
import { AuthService } from "./auth.service";
import {
  RegisterCustomerDto,
  RegisterDeliveryDto,
  RegisterManagerDto,
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
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { RolesGuard } from "./guards/roles.guard";
import { Roles } from "./decorators/roles.decorator";
import { CurrentUser } from "./decorators/current-user.decorator";
import { UserRole } from "./entities/user.entity";

@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("customer/register")
  registerCustomer(@Body() dto: RegisterCustomerDto) {
    return this.authService.registerCustomer(dto);
  }

  @Post("restaurant/register")
  registerRestaurant(@Body() dto: RegisterRestaurantDto) {
    return this.authService.registerRestaurant(dto);
  }

  @Post("restaurant/login")
  loginRestaurant(@Body() dto: LoginRestaurantDto) {
    return this.authService.loginRestaurant(dto);
  }

  @Post("delivery/register")
  registerDelivery(@Body() dto: RegisterDeliveryDto) {
    return this.authService.registerDelivery(dto);
  }

  @Post("verify-otp")
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto);
  }

  @Post("resend-otp")
  resendOtp(@Body() dto: ResendOtpDto) {
    return this.authService.resendOtp(dto);
  }

  @Post("customer/login")
  loginCustomer(@Body() dto: LoginCustomerDto) {
    return this.authService.loginCustomer(dto);
  }

  @Post("customer/login/verify-otp")
  verifyLoginOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyLoginOtp(dto);
  }

  @Post("delivery/forgot-password")
  forgotPasswordDelivery(@Body("phone") phone: string) {
    return this.authService.forgotPasswordDelivery(phone);
  }

  @Post("delivery/login")
  loginDelivery(@Body() dto: LoginDeliveryDto) {
    return this.authService.loginDelivery(dto);
  }

  @Post("manager/login")
  loginManager(@Body() dto: LoginManagerDto) {
    return this.authService.loginManager(dto);
  }

  @Post("refresh")
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Delete("logout")
  @UseGuards(JwtAuthGuard)
  logout(@CurrentUser("sub") userId: string, @Body() dto: RefreshTokenDto) {
    return this.authService.logout(userId, dto.refreshToken);
  }
}
