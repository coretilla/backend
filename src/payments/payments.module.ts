import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { StripeModule } from '../stripe/stripe.module';
import { BalanceService } from '../services/balance.service';
import { DatabaseModule } from '../database';

@Module({
  imports: [DatabaseModule, StripeModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, BalanceService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
