import { Injectable } from '@nestjs/common';

@Injectable()
export class ManagerServiceService {
  getHello(): string {
    return 'Hello World!';
  }
}
