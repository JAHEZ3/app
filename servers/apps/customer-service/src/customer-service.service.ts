import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from './entities/customer.entity';

@Injectable()
export class CustomerServiceService {
  private readonly logger = new Logger(CustomerServiceService.name);

  constructor(
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
  ) {}

  async createProfile(data: { userId: string; fullName: string }) {
    const existing = await this.customerRepo.findOne({ where: { userId: data.userId } });
    if (existing) {
      this.logger.warn(`Customer profile already exists for userId: ${data.userId}`);
      return;
    }
    await this.customerRepo.save(
      this.customerRepo.create({ userId: data.userId, fullName: data.fullName }),
    );
    this.logger.log(`Customer profile created for userId: ${data.userId}`);
  }
}
