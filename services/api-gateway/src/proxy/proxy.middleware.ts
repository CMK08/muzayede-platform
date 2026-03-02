import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as http from 'http';
import { ROUTE_CONFIGS } from './routes.config';

function extractUserIdFromJwt(authHeader?: string): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  try {
    const token = authHeader.split(' ')[1];
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    return payload.sub || payload.userId || payload.id || null;
  } catch {
    return null;
  }
}

@Injectable()
export class ProxyMiddleware implements NestMiddleware {
  private readonly logger = new Logger('ProxyMiddleware');

  use(req: Request, res: Response, next: NextFunction): void {
    const matchedRoute = ROUTE_CONFIGS.find((route) =>
      req.originalUrl.startsWith(route.prefix),
    );

    if (!matchedRoute) {
      next();
      return;
    }

    const targetUrl = new URL(matchedRoute.target);
    const startTime = Date.now();

    // Extract user ID from JWT and pass as header to downstream services
    const userId = extractUserIdFromJwt(req.headers.authorization as string);

    this.logger.log(
      `[PROXY] ${req.method} ${req.originalUrl} -> ${matchedRoute.target}${req.originalUrl} (${matchedRoute.serviceName})${userId ? ` [user: ${userId.slice(0, 12)}...]` : ''}`,
    );

    const headers: Record<string, string | string[] | undefined> = {
      ...req.headers,
      host: `${targetUrl.hostname}:${targetUrl.port}`,
    };

    if (userId) {
      headers['x-user-id'] = userId;
    }

    const proxyReq = http.request(
      {
        hostname: targetUrl.hostname,
        port: targetUrl.port,
        path: req.originalUrl,
        method: req.method,
        headers,
      },
      (proxyRes) => {
        const duration = Date.now() - startTime;
        this.logger.log(
          `[PROXY] ${req.method} ${req.originalUrl} <- ${proxyRes.statusCode} ${duration}ms (${matchedRoute.serviceName})`,
        );

        res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
        proxyRes.pipe(res, { end: true });
      },
    );

    proxyReq.on('error', (err) => {
      this.logger.error(
        `[PROXY] ${req.method} ${req.originalUrl} -> ${matchedRoute.target} FAILED: ${err.message}`,
      );
      if (!res.headersSent) {
        res.status(502).json({
          statusCode: 502,
          message: `Bad Gateway: ${matchedRoute.serviceName} is unavailable`,
          error: 'Bad Gateway',
          timestamp: new Date().toISOString(),
          path: req.originalUrl,
        });
      }
    });

    // Pipe the incoming request body to the proxy request
    req.pipe(proxyReq, { end: true });
  }
}
