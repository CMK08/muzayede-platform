import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('CmsService');
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
    .setTitle('Muzayede CMS Service')
    .setDescription('Content management for pages, banners, blog posts, and FAQs')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('pages', 'Static page management')
    .addTag('banners', 'Banner/slider management')
    .addTag('blog', 'Blog post management')
    .addTag('faq', 'FAQ management')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3014;
  await app.listen(port);
  logger.log(`CMS Service is running on port ${port}`);
}

bootstrap();
