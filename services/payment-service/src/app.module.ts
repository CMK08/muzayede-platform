import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { IyzicoModule } from './iyzico/iyzico.module';
import { EscrowModule } from './escrow/escrow.module';
import { CommissionModule } from './commission/commission.module';
import { PayoutModule } from './payout/payout.module';
import { InvoiceModule } from './invoice/invoice.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentModule } from './payment/payment.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    PrismaModule,
    IyzicoModule,
    EscrowModule,
    CommissionModule,
    PayoutModule,
    InvoiceModule,
    OrdersModule,
    PaymentModule,
  ],
})
export class AppModule {}
