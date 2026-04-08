import { Controller, Post, Body, Patch, Param, HttpCode, HttpStatus, Req } from '@nestjs/common';
import { Request } from 'express';
import { DeliveryAuthService } from './delivery-auth.service';
import { RegisterDeliveryDto } from './dto/register-delivery.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { LoginDeliveryDto } from './dto/login-delivery.dto';
import { ApproveDeliveryDto } from './dto/approve-delivery.dto';

@Controller('delivery')
export class DeliveryAuthController {
  constructor(private readonly deliveryAuthService: DeliveryAuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDeliveryDto) {
    return this.deliveryAuthService.register(dto);
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.deliveryAuthService.verifyOtp(dto);
  }

  @Patch('approve')
  approve(@Body() dto: ApproveDeliveryDto) {
    return this.deliveryAuthService.approve(dto);
  }

  @Patch('reject/:userId')
  reject(@Param('userId') userId: string) {
    return this.deliveryAuthService.reject(userId);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDeliveryDto, @Req() req: Request) {
    return this.deliveryAuthService.login(dto, { ipAddress: req.ip });
  }
}
