import { Module } from '@nestjs/common';
import { IyzicoService } from './iyzico.service';
import { IyzicoController } from './iyzico.controller';

@Module({
  controllers: [IyzicoController],
  providers: [IyzicoService],
  exports: [IyzicoService],
})
export class IyzicoModule {}
