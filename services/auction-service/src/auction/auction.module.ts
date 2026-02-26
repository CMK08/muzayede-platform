import { Module } from '@nestjs/common';
import { AuctionController } from './auction.controller';
import { AuctionService } from './auction.service';
import { AuctionStateMachine } from './auction-state.machine';
import { AntiSnipeService } from '../anti-snipe/anti-snipe.service';
import { AuctionSchedulerService } from '../scheduler/auction-scheduler.service';

@Module({
  controllers: [AuctionController],
  providers: [
    AuctionService,
    AuctionStateMachine,
    AntiSnipeService,
    AuctionSchedulerService,
  ],
  exports: [AuctionService],
})
export class AuctionModule {}
