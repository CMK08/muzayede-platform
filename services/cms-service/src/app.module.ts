import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { PagesModule } from './pages/pages.module';
import { BannersModule } from './banners/banners.module';
import { BlogModule } from './blog/blog.module';
import { FaqModule } from './faq/faq.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    PrismaModule,
    PagesModule,
    BannersModule,
    BlogModule,
    FaqModule,
  ],
})
export class AppModule {}
