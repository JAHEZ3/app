import { Controller, Post, Body, HttpCode, HttpStatus, Req } from '@nestjs/common';
import { Request } from 'express';
import { RestaurantAuthService } from './restaurant-auth.service';
import { RegisterRestaurantDto } from './dto/register-restaurant.dto';
import { LoginRestaurantDto } from './dto/login-restaurant.dto';

@Controller('restaurant')
export class RestaurantAuthController {
  constructor(private readonly restaurantAuthService: RestaurantAuthService) {}

  @Post('register')
  register(@Body() dto: RegisterRestaurantDto) {
    return this.restaurantAuthService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginRestaurantDto, @Req() req: Request) {
    return this.restaurantAuthService.login(dto, { ipAddress: req.ip });
  }
}
