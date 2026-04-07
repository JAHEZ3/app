import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ManagerServiceModule } from './manager-service.module';

async function bootstrap() {
  const app = await NestFactory.create(ManagerServiceModule);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.NATS,
    options: {
      servers: [process.env.NATS_URL || 'nats://localhost:4222'],
    },
  });

  app.setGlobalPrefix('api/manager');

  await app.startAllMicroservices();
  await app.listen(3006);

  console.log('Manager Service is running on http://localhost:3006/api/manager');
}
bootstrap();
