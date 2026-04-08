import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { DeliveryServiceService } from './delivery-service.service';

@Controller()
export class DeliveryServiceController {
  constructor(private readonly service: DeliveryServiceService) {}

  @EventPattern('user.delivery.created')
  handleDeliveryCreated(@Payload() data: {
    userId: string;
    fullName: string;
    phone: string;
    agentType: string;
    address: string | null;
  }) {
    return this.service.createAgent(data);
  }
}
