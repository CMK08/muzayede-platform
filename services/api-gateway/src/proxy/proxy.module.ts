import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ProxyMiddleware } from './proxy.middleware';

@Module({})
export class ProxyModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(ProxyMiddleware).forRoutes('*');
  }
}
