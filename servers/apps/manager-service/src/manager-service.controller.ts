import { Controller, Get } from '@nestjs/common';
import { ManagerServiceService } from './manager-service.service';

@Controller()
export class ManagerServiceController {
  constructor(private readonly managerServiceService: ManagerServiceService) {}

  @Get()
  getHello(): string {
    return this.managerServiceService.getHello();
  }
}
