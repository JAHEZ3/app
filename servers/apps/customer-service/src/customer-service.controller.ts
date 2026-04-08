import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { CustomerServiceService } from './customer-service.service';

@Controller()
export class CustomerServiceController {
  constructor(private readonly service: CustomerServiceService) {}

  @EventPattern('user.customer.created')
  handleCustomerCreated(@Payload() data: { userId: string; fullName: string }) {
    return this.service.createProfile(data);
  }
}
