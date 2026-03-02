import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { ShippingModule } from './shipping/shipping.module';
import { CarrierModule } from './carrier/carrier.module';
import { InsuranceModule } from './insurance/insurance.module';
import { WhiteGloveModule } from './white-glove/white-glove.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    PrismaModule,
    ShippingModule,
    CarrierModule,
    InsuranceModule,
    WhiteGloveModule,
  ],
})
export class AppModule {}
