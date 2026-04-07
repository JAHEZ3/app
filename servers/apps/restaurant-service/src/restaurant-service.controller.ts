import { Controller, Get } from '@nestjs/common';
import { RestaurantServiceService } from './restaurant-service.service';

@Controller()
export class RestaurantServiceController {
  constructor(private readonly restaurantServiceService: RestaurantServiceService) {}

  @Get()
  getHello(): string {
    return this.restaurantServiceService.getHello();
  }
}
