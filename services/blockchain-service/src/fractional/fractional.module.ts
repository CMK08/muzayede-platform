import { Module } from '@nestjs/common';
import { FractionalService } from './fractional.service';
import { FractionalController } from './fractional.controller';

@Module({
  controllers: [FractionalController],
  providers: [FractionalService],
  exports: [FractionalService],
})
export class FractionalModule {}
