import { NestFactory } from "@nestjs/core";
import { MicroserviceOptions, Transport } from "@nestjs/microservices";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AuthServiceModule } from "./auth-service.module";
import { HttpExceptionFilter } from "./filters/http-exception.filter";
import { ResponseInterceptor } from "./interceptors/response.interceptor";

async function bootstrap() {
  const app = await NestFactory.create(AuthServiceModule);
  const config = app.get(ConfigService);

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
      servers: [config.get<string>("NATS_URL", "nats://localhost:4222")],
    },
  });

  app.setGlobalPrefix("api/auth");

  app.enableCors({
    origin: ["http://localhost:30006", "http://localhost:3002"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  await app.startAllMicroservices();
  await app.listen(config.get<number>("AUTH_PORT", 3004));

  console.log(`Auth Service running on port ${config.get("AUTH_PORT", 3004)}`);
}
bootstrap();
