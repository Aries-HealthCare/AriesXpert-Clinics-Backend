import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: "*",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
    credentials: true,
  });

  app.setGlobalPrefix("api/v1");
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true, // Automatically transform payload to DTO instances
    }),
  );

  const config = new DocumentBuilder()
    .setTitle("AriesXpert CLINICS API")
    .setDescription("The AriesXpert Clinics API description")
    .setVersion("2.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document);

  // Expose Clinics API on Port 3006
  const PORT = process.env.PORT || 3006;
  await app.listen(PORT);
  console.log(`🚀 Clinics Application is running on: ${await app.getUrl()}`);
}
bootstrap();
