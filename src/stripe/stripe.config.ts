import { registerAs } from '@nestjs/config';

export default registerAs('stripe', () => ({
  secretKey: process.env.STRIPE_SECRET_KEY,
  publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  apiVersion: '2025-06-30.basil' as const,
}));
