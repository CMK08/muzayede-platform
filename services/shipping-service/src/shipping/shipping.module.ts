import { Module } from '@nestjs/common';
import { ShippingController } from './shipping.controller';
import { ShippingService } from './shipping.service';
import { LabelService } from '../label/label.service';

@Module({
  controllers: [ShippingController],
  providers: [ShippingService, LabelService],
  exports: [ShippingService, LabelService],
})
export class ShippingModule {}
