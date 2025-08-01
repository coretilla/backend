import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database';
import { UsersModule } from './users/users.module';
import { CacheModule } from './cache';
import { AuthModule } from './auth/auth.module';
import { StripeModule } from './stripe/stripe.module';
import { PaymentsModule } from './payments/payments.module';
import { StripeWebhookController } from './webhooks/stripe-webhook.controller';
import { FinanceModule } from './finance/finance.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    CacheModule,
    DatabaseModule,
    UsersModule,
    AuthModule,
    StripeModule,
    PaymentsModule,
    FinanceModule,
  ],
  controllers: [AppController, StripeWebhookController],
  providers: [AppService],
})
export class AppModule {}
