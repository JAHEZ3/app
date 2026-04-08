import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Restaurant, RestaurantStatus } from './entities/restaurant.entity';

@Injectable()
export class RestaurantServiceService {
  private readonly logger = new Logger(RestaurantServiceService.name);

  constructor(
    @InjectRepository(Restaurant)
    private readonly restaurantRepo: Repository<Restaurant>,
  ) {}

  async createRestaurant(data: {
    userId: string;
    name: string;
    ownerName: string;
    phone: string;
    street: string | null;
  }) {
    const existing = await this.restaurantRepo.findOne({ where: { ownerUserId: data.userId } });
    if (existing) {
      this.logger.warn(`Restaurant already exists for userId: ${data.userId}`);
      return;
    }
    await this.restaurantRepo.save(
      this.restaurantRepo.create({
        ownerUserId: data.userId,
        name: data.name,
        phone: data.phone,
        street: data.street,
        status: RestaurantStatus.PENDING_APPROVAL,
        isOpen: false,
      }),
    );
    this.logger.log(`Restaurant created for userId: ${data.userId} — pending approval`);
  }
}
