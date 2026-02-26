import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { TrustScoreService } from '../trust-score/trust-score.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, TrustScoreService],
  exports: [UsersService, TrustScoreService],
})
export class UsersModule {}
