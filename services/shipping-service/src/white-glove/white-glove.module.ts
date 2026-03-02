import { Module } from '@nestjs/common';
import { WhiteGloveController } from './white-glove.controller';
import { WhiteGloveService } from './white-glove.service';

@Module({
  controllers: [WhiteGloveController],
  providers: [WhiteGloveService],
  exports: [WhiteGloveService],
})
export class WhiteGloveModule {}
