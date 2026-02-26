import { Module } from '@nestjs/common';
import { BidController } from './bid.controller';
import { BidService } from './bid.service';
import { ProxyBidService } from '../proxy-bid/proxy-bid.service';
import { ShillDetectionService } from '../shill-detection/shill-detection.service';
import { BidGateway } from '../websocket/bid.gateway';

@Module({
  controllers: [BidController],
  providers: [BidService, ProxyBidService, ShillDetectionService, BidGateway],
  exports: [BidService],
})
export class BidModule {}
