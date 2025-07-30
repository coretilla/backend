import {
  Controller,
  Post,
  Body,
  Headers,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import { Request } from 'express';
import { PaymentsService } from '../payments/payments.service';
import { StripeService } from '../stripe/stripe.service';
import { Logger } from '@nestjs/common';

@ApiTags('Webhooks')
@Controller('webhooks')
export class StripeWebhookController {
  private readonly logger = new Logger(StripeWebhookController.name);

  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly stripeService: StripeService,
  ) {}

  @Post('stripe')
  @ApiExcludeEndpoint() // Hide from Swagger docs for security
  @ApiOperation({
    summary: 'Stripe webhook endpoint',
    description: 'Handle Stripe webhook events (internal endpoint)',
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook processed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid webhook signature or payload',
  })
  async handleStripeWebhook(
    @Req() request: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ): Promise<{ received: boolean }> {
    try {
      // Get raw body for signature verification
      const body = request.rawBody;

      if (!body) {
        throw new Error('No body provided');
      }

      if (!signature) {
        throw new Error('No stripe signature provided');
      }

      // Verify webhook signature and construct event
      const event = this.stripeService.constructWebhookEvent(body, signature);

      this.logger.log(`Received Stripe webhook: ${event.type} - ${event.id}`);

      // Process the event
      await this.paymentsService.handleStripeWebhook(event);

      return { received: true };
    } catch (error) {
      this.logger.error(`Webhook processing failed: ${error.message}`);
      throw error;
    }
  }
}
