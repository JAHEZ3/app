import { NestFactory } from "@nestjs/core";
import { MicroserviceOptions, Transport } from "@nestjs/microservices";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AuthServiceModule } from "./auth-service.module";
import { HttpExceptionFilter } from "./filters/http-exception.filter";
import { ResponseInterceptor } from "./interceptors/response.interceptor";

process.on("uncaughtException", (err) => {
  console.error("[خطأ فادح] استثناء غير متوقع:", err.message, "\n", err.stack);
});
process.on("unhandledRejection", (reason) => {
  console.error("[خطأ فادح] وعد مرفوض غير معالج:", reason);
});

async function bootstrap() {
  const app = await NestFactory.create(AuthServiceModule);
  const config = app.get(ConfigService);

  const rawOrigins = config.get<string>("CORS_ORIGINS", "");
  const allowedOrigins = rawOrigins ? rawOrigins.split(",").map((o) => o.trim()) : [];
  const isProd = config.get<string>("NODE_ENV") === "production";
  const LOCALHOST_RE = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.length === 0) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      if (!isProd && LOCALHOST_RE.test(origin)) return callback(null, true);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
    allowedHeaders: "Content-Type,Authorization",
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.NATS,
    options: { servers: [config.get<string>("NATS_URL", "nats://localhost:4222")] },
  });

  app.setGlobalPrefix("api/auth");
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  await app.startAllMicroservices();
  await app.listen(config.get<number>("AUTH_PORT", 3004));
  console.log(`Auth Service running on port ${config.get("AUTH_PORT", 3004)}`);
}
bootstrap();
