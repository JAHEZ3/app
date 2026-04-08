import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { RestaurantServiceService } from './restaurant-service.service';

@Controller()
export class RestaurantServiceController {
  constructor(private readonly service: RestaurantServiceService) {}

  @EventPattern('user.restaurant.created')
  handleRestaurantCreated(@Payload() data: {
    userId: string;
    name: string;
    ownerName: string;
    phone: string;
    street: string | null;
  }) {
    return this.service.createRestaurant(data);
  }
}
