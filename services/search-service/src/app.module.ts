import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { ElasticsearchWrapperModule } from './elasticsearch/elasticsearch.module';
import { IndexerModule } from './indexer/indexer.module';
import { SearchModule } from './search/search.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    PrismaModule,
    ElasticsearchWrapperModule,
    IndexerModule,
    SearchModule,
  ],
})
export class AppModule {}
