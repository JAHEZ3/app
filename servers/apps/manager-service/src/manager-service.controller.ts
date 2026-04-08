import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { ManagerServiceService } from './manager-service.service';

@Controller()
export class ManagerServiceController {
  constructor(private readonly service: ManagerServiceService) {}

  @EventPattern('user.manager.created')
  handleManagerCreated(@Payload() data: {
    userId: string;
    fullName: string;
  }) {
    return this.service.createManager(data);
  }
}
