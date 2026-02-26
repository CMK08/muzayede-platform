import { Module } from '@nestjs/common';
import { NftService } from './nft.service';
import { NftController } from './nft.controller';

@Module({
  controllers: [NftController],
  providers: [NftService],
  exports: [NftService],
})
export class NftModule {}
