import { Module } from '@nestjs/common';
import { CarrierController } from './carrier.controller';
import { CarrierService } from './carrier.service';
import { ShippingModule } from '../shipping/shipping.module';

@Module({
  imports: [ShippingModule],
  controllers: [CarrierController],
  providers: [CarrierService],
  exports: [CarrierService],
})
export class CarrierModule {}
