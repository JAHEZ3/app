import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from './entities/customer.entity';

export interface CustomerCreatedPayload {
  userId: string;
  fullName: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  locationLat: number;
  locationLng: number;
}

@Injectable()
export class CustomerServiceService {
  private readonly logger = new Logger(CustomerServiceService.name);

  constructor(
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
  ) {}

  async createProfile(data: CustomerCreatedPayload): Promise<void> {
    const existing = await this.customerRepo.findOne({ where: { userId: data.userId } });
    if (existing) {
      this.logger.warn(`Customer profile already exists for userId: ${data.userId}`);
      return;
    }

    await this.customerRepo.save(
      this.customerRepo.create({
        userId: data.userId,
        firstName: data.firstName,
        lastName: data.lastName,
        fullName: data.fullName,
        dateOfBirth: data.dateOfBirth,
        locationLat: data.locationLat,
        locationLng: data.locationLng,
      }),
    );

    this.logger.log(`Customer profile created for userId: ${data.userId}`);
  }
}
