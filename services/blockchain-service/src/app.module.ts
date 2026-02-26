import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { NftModule } from './nft/nft.module';
import { ProvenanceModule } from './provenance/provenance.module';
import { FractionalModule } from './fractional/fractional.module';
import { BadgesModule } from './badges/badges.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    PrismaModule,
    NftModule,
    ProvenanceModule,
    FractionalModule,
    BadgesModule,
  ],
})
export class AppModule {}
