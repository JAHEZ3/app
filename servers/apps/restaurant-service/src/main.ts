import "dotenv/config";
import { NestFactory } from "@nestjs/core";
import { MicroserviceOptions, Transport } from "@nestjs/microservices";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { RestaurantServiceModule } from "./restaurant-service.module";
import { HttpExceptionFilter } from "./filters/http-exception.filter";

process.on("uncaughtException", (err) => {
  console.error("[خطأ فادح] استثناء غير متوقع:", err.message, "\n", err.stack);
});
process.on("unhandledRejection", (reason) => {
  console.error("[خطأ فادح] وعد مرفوض غير معالج:", reason);
});

async function bootstrap() {
  const app = await NestFactory.create(RestaurantServiceModule);
  const config = app.get(ConfigService);

  app.enableCors({
    origin: config.get<string>("CORS_ORIGINS", "*").split(","),
    credentials: true,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
    allowedHeaders: "Content-Type,Authorization",
  });

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.NATS,
    options: { servers: [config.get<string>("NATS_URL", "nats://localhost:4222")] },
  });

  app.setGlobalPrefix("api/restaurant");
  app.useGlobalFilters(new HttpExceptionFilter());

  await app.startAllMicroservices();
  await app.listen(config.get<number>("RESTAURANT_PORT", 3003));
  console.log(
    `Restaurant Service is running on http://localhost:${config.get("RESTAURANT_PORT", 3003)}/api/restaurant`,
  );
}
bootstrap();
