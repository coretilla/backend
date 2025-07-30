import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StripeService } from './stripe.service';
import stripeConfig from './stripe.config';

@Module({
  imports: [ConfigModule.forFeature(stripeConfig)],
  providers: [StripeService],
  exports: [StripeService],
})
export class StripeModule {}
