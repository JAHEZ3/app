import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { DeliveryServiceModule } from './delivery-service.module';

async function bootstrap() {
  const app = await NestFactory.create(DeliveryServiceModule);
  const config = app.get(ConfigService);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.NATS,
    options: {
      servers: [config.get<string>('NATS_URL', 'nats://localhost:4222')],
    },
  });

  app.setGlobalPrefix('api/delivery');

  await app.startAllMicroservices();
  await app.listen(config.get<number>('DELIVERY_PORT', 3002));

  console.log(`Delivery Service running on http://localhost:${config.get('DELIVERY_PORT', 3002)}/api/delivery`);
}
bootstrap();
