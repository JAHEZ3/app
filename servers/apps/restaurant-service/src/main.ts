import "dotenv/config";
import { NestFactory } from "@nestjs/core";
import { MicroserviceOptions, Transport } from "@nestjs/microservices";
import { ValidationPipe } from "@nestjs/common";
import { RestaurantServiceModule } from "./restaurant-service.module";

async function bootstrap() {
  const app = await NestFactory.create(RestaurantServiceModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.NATS,
    options: {
      servers: [process.env.NATS_URL || "nats://localhost:4222"],
    },
  });

  app.setGlobalPrefix("api/restaurant");

  await app.startAllMicroservices();
  await app.listen(3003);

  console.log(
    "Restaurant Service is running on http://localhost:3003/api/restaurant",
  );
}
bootstrap();
