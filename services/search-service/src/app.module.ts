import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ElasticsearchModule } from '@nestjs/elasticsearch';
import { PrismaModule } from './prisma/prisma.module';
import { SearchModule } from './search/search.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    PrismaModule,
    ElasticsearchModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        node: configService.get<string>('ELASTICSEARCH_URL', 'http://localhost:9200'),
        auth: {
          username: configService.get<string>('ELASTICSEARCH_USERNAME', 'elastic'),
          password: configService.get<string>('ELASTICSEARCH_PASSWORD', ''),
        },
        maxRetries: 5,
        requestTimeout: 30000,
      }),
      inject: [ConfigService],
    }),
    SearchModule,
  ],
})
export class AppModule {}
