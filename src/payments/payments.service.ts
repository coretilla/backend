import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { StripeService } from '../stripe/stripe.service';
import { BalanceService } from '../services/balance.service';
import { CreateDepositDto, ConfirmDepositDto } from './dto';
import { DepositStatus, TransactionType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private stripeService: StripeService,
    private balanceService: BalanceService,
  ) {}

  /**
   * Create a new deposit intent
   */
  async createDeposit(
    walletAddress: string,
    createDepositDto: CreateDepositDto,
  ): Promise<{
    deposit_id: number;
    client_secret: string;
    amount: number;
    currency: string;
    status: DepositStatus;
  }> {
    try {
      // Get or create user
      const user = await this.prisma.user.findUnique({
        where: { wallet_address: walletAddress },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Create payment intent in Stripe
      const paymentIntent = await this.stripeService.createPaymentIntent(
        createDepositDto.amount,
        createDepositDto.currency,
        {
          user_wallet: walletAddress,
          description: createDepositDto.description || 'Deposit to account',
        },
      );

      // Create deposit record in database
      const deposit = await this.prisma.deposit.create({
        data: {
          user_id: user.id,
          stripe_payment_intent_id: paymentIntent.id,
          amount: new Decimal(createDepositDto.amount),
          currency: createDepositDto.currency || 'usd',
          status: DepositStatus.PENDING,
          stripe_client_secret: paymentIntent.client_secret,
          metadata: {
            description: createDepositDto.description,
            created_via: 'api',
          },
        },
      });

      this.logger.log(
        `Deposit created: ${deposit.id} for user ${walletAddress} amount ${createDepositDto.amount}`,
      );

      return {
        deposit_id: deposit.id,
        client_secret: paymentIntent.client_secret!,
        amount: parseFloat(deposit.amount.toString()),
        currency: deposit.currency,
        status: deposit.status,
      };
    } catch (error) {
      this.logger.error(`Failed to create deposit: ${error.message}`);
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to create deposit');
    }
  }

  /**
   * Confirm a deposit payment
   */
  async confirmDeposit(
    walletAddress: string,
    confirmDepositDto: ConfirmDepositDto,
  ): Promise<{
    success: boolean;
    deposit_id: number;
    new_balance: number;
    transaction_id: number;
  }> {
    try {
      // Get deposit record
      const deposit = await this.prisma.deposit.findUnique({
        where: {
          stripe_payment_intent_id: confirmDepositDto.payment_intent_id,
        },
        include: {
          user: true,
        },
      });

      if (!deposit) {
        throw new NotFoundException('Deposit not found');
      }

      // Verify user owns this deposit
      if (deposit.user.wallet_address !== walletAddress) {
        throw new BadRequestException('Unauthorized access to deposit');
      }

      // Check if already processed
      if (deposit.status === DepositStatus.COMPLETED) {
        throw new BadRequestException('Deposit already processed');
      }

      // Confirm payment with Stripe
      const paymentIntent = await this.stripeService.confirmPaymentIntent(
        confirmDepositDto.payment_intent_id,
        confirmDepositDto.payment_method_id,
      );

      // Update deposit status
      await this.prisma.deposit.update({
        where: { id: deposit.id },
        data: {
          status:
            paymentIntent.status === 'succeeded'
              ? DepositStatus.COMPLETED
              : DepositStatus.PROCESSING,
        },
      });

      // If payment succeeded, add balance
      if (paymentIntent.status === 'succeeded') {
        // Get user ID from deposit
        const user = await this.prisma.user.findUnique({
          where: { wallet_address: walletAddress },
        });

        if (!user) {
          throw new NotFoundException('User not found');
        }

        // Add balance using BalanceService
        const result = await this.balanceService.addBalance(
          user.id,
          parseFloat(deposit.amount.toString()),
          `Deposit via Stripe - ${deposit.stripe_payment_intent_id}`,
        );

        this.logger.log(
          `Deposit confirmed: ${deposit.id} for user ${walletAddress} amount ${deposit.amount}`,
        );

        return {
          success: true,
          deposit_id: deposit.id,
          new_balance: result.balance,
          transaction_id: result.transactionId,
        };
      } else {
        throw new BadRequestException('Payment confirmation failed');
      }
    } catch (error) {
      this.logger.error(`Failed to confirm deposit: ${error.message}`);
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException('Failed to confirm deposit');
    }
  }

  /**
   * Get deposit by ID
   */
  async getDeposit(
    walletAddress: string,
    depositId: number,
  ): Promise<{
    id: number;
    amount: number;
    currency: string;
    status: DepositStatus;
    created_at: Date;
    updated_at: Date;
  }> {
    const deposit = await this.prisma.deposit.findFirst({
      where: {
        id: depositId,
        user: {
          wallet_address: walletAddress,
        },
      },
    });

    if (!deposit) {
      throw new NotFoundException('Deposit not found');
    }

    return {
      id: deposit.id,
      amount: parseFloat(deposit.amount.toString()),
      currency: deposit.currency,
      status: deposit.status,
      created_at: deposit.created_at,
      updated_at: deposit.updated_at,
    };
  }

  /**
   * Get user deposits with pagination
   */
  async getUserDeposits(
    walletAddress: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    deposits: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { wallet_address: walletAddress },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const skip = (page - 1) * limit;

    const [deposits, total] = await Promise.all([
      this.prisma.deposit.findMany({
        where: { user_id: user.id },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.deposit.count({
        where: { user_id: user.id },
      }),
    ]);

    const formattedDeposits = deposits.map((deposit) => ({
      ...deposit,
      amount: parseFloat(deposit.amount.toString()),
    }));

    return {
      deposits: formattedDeposits,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Handle Stripe webhook events
   */
  async handleStripeWebhook(event: any): Promise<void> {
    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSucceeded(event.data.object);
          break;
        case 'payment_intent.payment_failed':
          await this.handlePaymentFailed(event.data.object);
          break;
        default:
          this.logger.log(`Unhandled webhook event: ${event.type}`);
      }
    } catch (error) {
      this.logger.error(`Webhook processing failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Handle successful payment webhook
   */
  private async handlePaymentSucceeded(paymentIntent: any): Promise<void> {
    const deposit = await this.prisma.deposit.findUnique({
      where: {
        stripe_payment_intent_id: paymentIntent.id,
      },
      include: {
        user: true,
      },
    });

    if (!deposit) {
      this.logger.warn(
        `Deposit not found for payment intent: ${paymentIntent.id}`,
      );
      return;
    }

    // Skip if already completed
    if (deposit.status === DepositStatus.COMPLETED) {
      return;
    }

    // Update deposit status
    await this.prisma.deposit.update({
      where: { id: deposit.id },
      data: { status: DepositStatus.COMPLETED },
    });

    // Add balance to user account
    await this.balanceService.addBalance(
      deposit.user_id,
      parseFloat(deposit.amount.toString()),
      `Deposit via Stripe Webhook - ${deposit.stripe_payment_intent_id}`,
    );

    this.logger.log(
      `Webhook: Deposit ${deposit.id} completed for user ${deposit.user.wallet_address}`,
    );
  }

  /**
   * Handle failed payment webhook
   */
  private async handlePaymentFailed(paymentIntent: any): Promise<void> {
    const deposit = await this.prisma.deposit.findUnique({
      where: {
        stripe_payment_intent_id: paymentIntent.id,
      },
    });

    if (!deposit) {
      this.logger.warn(
        `Deposit not found for payment intent: ${paymentIntent.id}`,
      );
      return;
    }

    // Update deposit status to failed
    await this.prisma.deposit.update({
      where: { id: deposit.id },
      data: { status: DepositStatus.FAILED },
    });

    this.logger.log(`Webhook: Deposit ${deposit.id} failed`);
  }
}
