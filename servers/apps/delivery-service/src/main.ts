import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { DeliveryServiceModule } from './delivery-service.module';

async function bootstrap() {
  const app = await NestFactory.create(DeliveryServiceModule);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.NATS,
    options: {
      servers: [process.env.NATS_URL || 'nats://localhost:4222'],
    },
  });

  app.setGlobalPrefix('api/delivery');

  await app.startAllMicroservices();
  await app.listen(3002);

  console.log('Delivery Service is running on http://localhost:3002/api/delivery');
}
bootstrap();
