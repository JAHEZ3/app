import { Controller, Post, Body, Patch, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { DeliveryAuthService } from './delivery-auth.service';
import { RegisterDeliveryDto } from './dto/register-delivery.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { LoginDeliveryDto } from './dto/login-delivery.dto';
import { ApproveDeliveryDto } from './dto/approve-delivery.dto';

@Controller('delivery')
export class DeliveryAuthController {
  constructor(private readonly deliveryAuthService: DeliveryAuthService) {}

  /** Step 1: Register – freelance() → checkingData() → sends OTP */
  @Post('register')
  register(@Body() dto: RegisterDeliveryDto) {
    return this.deliveryAuthService.register(dto);
  }

  /** Step 2: Verify OTP → 48h background check (PENDING) */
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.deliveryAuthService.verifyOtp(dto);
  }

  /** Admin: Approve → sendPassword() */
  @Patch('approve')
  approve(@Body() dto: ApproveDeliveryDto) {
    return this.deliveryAuthService.approve(dto);
  }

  /** Admin: Reject → Show Reject Message */
  @Patch('reject/:userId')
  reject(@Param('userId') userId: string) {
    return this.deliveryAuthService.reject(userId);
  }

  /** Login(phone, password) → Dashboard */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDeliveryDto) {
    return this.deliveryAuthService.login(dto);
  }
}
