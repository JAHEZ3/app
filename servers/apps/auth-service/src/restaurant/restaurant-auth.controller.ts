import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { RestaurantAuthService } from './restaurant-auth.service';
import { RegisterRestaurantDto } from './dto/register-restaurant.dto';
import { LoginRestaurantDto } from './dto/login-restaurant.dto';

@Controller('restaurant')
export class RestaurantAuthController {
  constructor(private readonly restaurantAuthService: RestaurantAuthService) {}

  /** Register – Checking() → saveRestaurant() → sendPassword() */
  @Post('register')
  register(@Body() dto: RegisterRestaurantDto) {
    return this.restaurantAuthService.register(dto);
  }

  /** Login(phoneNo, password) → Dashboard */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginRestaurantDto) {
    return this.restaurantAuthService.login(dto);
  }
}
