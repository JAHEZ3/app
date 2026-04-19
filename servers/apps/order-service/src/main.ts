import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ValidationPipe } from '@nestjs/common';
import { OrderServiceModule } from './order-service.module';
import { HttpExceptionFilter } from './filters/http-exception.filter';

process.on('uncaughtException', (err) => {
  console.error('[خطأ فادح] استثناء غير متوقع:', err.message, '\n', err.stack);
});
process.on('unhandledRejection', (reason) => {
  console.error('[خطأ فادح] وعد مرفوض غير معالج:', reason);
});

async function bootstrap() {
  const app = await NestFactory.create(OrderServiceModule);

  app.enableCors({
    origin: (process.env.CORS_ORIGINS || '*').split(','),
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type,Authorization',
  });

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.NATS,
    options: { servers: [process.env.NATS_URL || 'nats://localhost:4222'] },
  });

  app.setGlobalPrefix('api/order');
  app.useGlobalFilters(new HttpExceptionFilter());

  await app.startAllMicroservices();
  await app.listen(3001);
  console.log('Order Service is running on http://localhost:3001/api/order');
}
bootstrap();
