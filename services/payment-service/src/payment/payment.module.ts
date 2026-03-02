import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { IyzicoModule } from '../iyzico/iyzico.module';
import { EscrowModule } from '../escrow/escrow.module';
import { CommissionModule } from '../commission/commission.module';
import { InvoiceModule } from '../invoice/invoice.module';

@Module({
  imports: [IyzicoModule, EscrowModule, CommissionModule, InvoiceModule],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
