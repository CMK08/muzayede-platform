import { Global, Module } from '@nestjs/common';
import { ElasticsearchWrapperService } from './elasticsearch.service';

@Global()
@Module({
  providers: [ElasticsearchWrapperService],
  exports: [ElasticsearchWrapperService],
})
export class ElasticsearchWrapperModule {}
