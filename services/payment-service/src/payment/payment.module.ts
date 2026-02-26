import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { IyzicoService } from '../iyzico/iyzico.service';
import { EscrowService } from '../escrow/escrow.service';
import { CommissionService } from '../commission/commission.service';
import { InvoiceService } from '../invoice/invoice.service';

@Module({
  controllers: [PaymentController],
  providers: [
    PaymentService,
    IyzicoService,
    EscrowService,
    CommissionService,
    InvoiceService,
  ],
  exports: [PaymentService, CommissionService, InvoiceService, EscrowService],
})
export class PaymentModule {}
