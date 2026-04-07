import { Test, TestingModule } from '@nestjs/testing';
import { ManagerServiceController } from './manager-service.controller';
import { ManagerServiceService } from './manager-service.service';

describe('ManagerServiceController', () => {
  let managerServiceController: ManagerServiceController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [ManagerServiceController],
      providers: [ManagerServiceService],
    }).compile();

    managerServiceController = app.get<ManagerServiceController>(ManagerServiceController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(managerServiceController.getHello()).toBe('Hello World!');
    });
  });
});
