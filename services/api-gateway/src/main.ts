import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Request, Response, NextFunction } from 'express';
import { AppModule } from './app.module';
import { ROUTE_CONFIGS } from './proxy/routes.config';

/**
 * Simple in-memory rate limiter: 100 requests per minute per IP.
 */
class RateLimiter {
  private readonly windowMs = 60_000; // 1 minute
  private readonly maxRequests = 100;
  private readonly hits = new Map<string, { count: number; resetAt: number }>();

  isAllowed(ip: string): boolean {
    const now = Date.now();
    const record = this.hits.get(ip);

    if (!record || now > record.resetAt) {
      this.hits.set(ip, { count: 1, resetAt: now + this.windowMs });
      return true;
    }

    record.count++;
    return record.count <= this.maxRequests;
  }

  /** Periodically clean up expired entries to prevent memory leaks */
  cleanup(): void {
    const now = Date.now();
    for (const [ip, record] of this.hits) {
      if (now > record.resetAt) {
        this.hits.delete(ip);
      }
    }
  }
}

async function bootstrap() {
  const logger = new Logger('ApiGateway');
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
  });

  // CORS
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3080',
      ...(process.env.CORS_ORIGINS?.split(',') || []),
    ].filter(Boolean),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
    ],
  });

  // Rate Limiting middleware
  const rateLimiter = new RateLimiter();

  // Clean up rate limiter every 5 minutes
  setInterval(() => rateLimiter.cleanup(), 5 * 60_000);

  app.use((req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    if (!rateLimiter.isAllowed(ip)) {
      res.status(429).json({
        statusCode: 429,
        message: 'Too Many Requests: rate limit exceeded (100 req/min)',
        error: 'Too Many Requests',
        timestamp: new Date().toISOString(),
      });
      return;
    }
    next();
  });

  // Request logging middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    const { method, originalUrl } = req;

    res.on('finish', () => {
      const duration = Date.now() - start;
      const { statusCode } = res;
      logger.log(`${method} ${originalUrl} ${statusCode} ${duration}ms`);
    });

    next();
  });

  // Global error handler for unhandled errors
  app.use(
    (err: Error, _req: Request, res: Response, _next: NextFunction) => {
      logger.error(`Unhandled error: ${err.message}`, err.stack);
      if (!res.headersSent) {
        res.status(500).json({
          statusCode: 500,
          message: 'Internal Server Error',
          error: err.message,
          timestamp: new Date().toISOString(),
        });
      }
    },
  );

  // Swagger docs
  const config = new DocumentBuilder()
    .setTitle('Muzayede API Gateway')
    .setDescription(
      'API Gateway that proxies requests to backend microservices. ' +
        'All routes are prefixed with /api/v1/ and forwarded to the appropriate service.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('health', 'Health check endpoints')
    .addTag('proxy', 'Proxied routes to backend services')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // Add proxy route documentation to swagger
  for (const route of ROUTE_CONFIGS) {
    const tag = route.prefix.replace('/api/v1/', '');
    document.tags = document.tags || [];
    if (!document.tags.find((t) => t.name === tag)) {
      document.tags.push({
        name: tag,
        description: `Proxied to ${route.serviceName} (${route.target})`,
      });
    }
    document.paths = document.paths || {};
    document.paths[`${route.prefix}/{path}`] = {
      get: {
        tags: [tag],
        summary: `Proxy to ${route.serviceName}`,
        description: `Forwards GET requests to ${route.target}${route.prefix}/{path}`,
        parameters: [
          {
            name: 'path',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'Sub-path to forward',
          },
        ],
        responses: {
          '200': { description: 'Proxied response from downstream service' },
          '502': { description: 'Bad Gateway - downstream service unavailable' },
          '429': { description: 'Too Many Requests - rate limit exceeded' },
        },
        security: [{ bearer: [] }],
      },
    };
  }

  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 4000;
  await app.listen(port);
  logger.log(`API Gateway is running on port ${port}`);
  logger.log(`Swagger docs available at http://localhost:${port}/api/docs`);
  logger.log(`Health check available at http://localhost:${port}/health`);
}

bootstrap();
