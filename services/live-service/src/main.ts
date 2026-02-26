import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('LiveService');
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.setGlobalPrefix('api/v1');

  const config = new DocumentBuilder()
    .setTitle('Muzayede Live Service')
    .setDescription('Live auction streaming, auctioneer controls, chat, and absentee bidding')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('live')
    .addTag('auctioneer')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3010;
  await app.listen(port);
  logger.log(`Live Service is running on port ${port}`);
  logger.log(`WebSocket gateways (chat, streaming) available on the same port`);
}

bootstrap();
