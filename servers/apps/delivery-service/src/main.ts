import { NestFactory } from "@nestjs/core";
import { MicroserviceOptions, Transport } from "@nestjs/microservices";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DeliveryServiceModule } from "./delivery-service.module";
import { HttpExceptionFilter } from "./filters/http-exception.filter";

process.on("uncaughtException", (err) => {
  console.error("[خطأ فادح] استثناء غير متوقع:", err.message, "\n", err.stack);
});
process.on("unhandledRejection", (reason) => {
  console.error("[خطأ فادح] وعد مرفوض غير معالج:", reason);
});

async function bootstrap() {
  const app = await NestFactory.create(DeliveryServiceModule);
  const config = app.get(ConfigService);

  // CORS — strict allowlist with dev-only LAN regex fallback.
  const rawOrigins = config.get<string>("CORS_ORIGINS", "");
  const allowedOrigins = rawOrigins
    ? rawOrigins.split(",").map((o) => o.trim()).filter(Boolean)
    : [];
  const isProd = config.get<string>("NODE_ENV") === "production";
  const LOCALHOST_RE = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
  const LAN_RE =
    /^https?:\/\/(10(\.\d{1,3}){3}|172\.(1[6-9]|2\d|3[0-1])(\.\d{1,3}){2}|192\.168(\.\d{1,3}){2})(:\d+)?$/;

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.length === 0 || allowedOrigins.includes("*"))
        return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      if (!isProd && (LOCALHOST_RE.test(origin) || LAN_RE.test(origin)))
        return callback(null, true);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
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

  app.setGlobalPrefix("api/delivery");
  app.useGlobalFilters(new HttpExceptionFilter());

  await app.startAllMicroservices();
  await app.listen(config.get<number>("DELIVERY_PORT", 3002));
  console.log(
    `Delivery Service running on http://localhost:${config.get("DELIVERY_PORT", 3002)}/api/delivery`,
  );
}
bootstrap();
