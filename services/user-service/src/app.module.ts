import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { GdprModule } from './gdpr/gdpr.module';
import { SellerProfileModule } from './seller-profile/seller-profile.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    PrismaModule,
    UsersModule,
    GdprModule,
    SellerProfileModule,
  ],
})
export class AppModule {}
