import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { CustomerAuthService } from './customer-auth.service';
import { RegisterCustomerDto } from './dto/register-customer.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { SetPasswordDto } from './dto/set-password.dto';
import { LoginCustomerDto } from './dto/login-customer.dto';

@Controller('customer')
export class CustomerAuthController {
  constructor(private readonly customerAuthService: CustomerAuthService) {}

  /** Step 1: Register – sends (Full_Name, Mobile_No, birthdate) → receive OTP */
  @Post('register')
  register(@Body() dto: RegisterCustomerDto) {
    return this.customerAuthService.register(dto);
  }

  /** Step 2: Verify OTP – customer sends code back */
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.customerAuthService.verifyOtp(dto);
  }

  /** Step 3: Set password – saveCustomer() → User Created */
  @Post('set-password')
  @HttpCode(HttpStatus.OK)
  setPassword(@Body() dto: SetPasswordDto) {
    return this.customerAuthService.setPassword(dto);
  }

  /** Login – Login(phone, password) */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginCustomerDto) {
    return this.customerAuthService.login(dto);
  }
}
