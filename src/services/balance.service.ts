import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import { TransactionType } from '@prisma/client';

/**
 * Balance Service - INTERNAL USE ONLY
 *
 * This service handles balance operations that should only be called by:
 * - Payment webhooks (Stripe)
 * - Internal business logic
 * - Payment processing services
 *
 * ⚠️ DO NOT expose these methods through public API endpoints
 */
@Injectable()
export class BalanceService {
  constructor(private prisma: PrismaService) {}

  /**
   * Add balance to user account
   * ⚠️ INTERNAL USE ONLY - Should only be called by payment webhooks or business logic
   * NOT exposed through public API endpoints
   */
  async addBalance(
    userId: number,
    amount: number,
    description?: string,
  ): Promise<{
    balance: number;
    transactionId: number;
  }> {
    // Start transaction to ensure consistency
    const result = await this.prisma.$transaction(async (tx) => {
      // Get current user
      const user = await tx.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Update user balance
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          balance: {
            increment: new Decimal(amount),
          },
        },
      });

      // Create transaction record
      const transaction = await tx.transaction.create({
        data: {
          user_id: userId,
          amount: new Decimal(amount),
          type: TransactionType.DEPOSIT,
          description: description || 'Balance deposit',
          balance_after: updatedUser.balance,
        },
      });

      return {
        balance: parseFloat(updatedUser.balance.toString()),
        transactionId: transaction.id,
      };
    });

    return result;
  }

  /**
   * Subtract balance from user account
   * ⚠️ INTERNAL USE ONLY - Should only be called by business logic (withdrawals, purchases, etc.)
   * NOT exposed through public API endpoints
   */
  async subtractBalance(
    userId: number,
    amount: number,
    description?: string,
  ): Promise<{
    balance: number;
    transactionId: number;
  }> {
    // Start transaction to ensure consistency
    const result = await this.prisma.$transaction(async (tx) => {
      // Get current user
      const user = await tx.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Check if user has sufficient balance
      const currentBalance = parseFloat(user.balance.toString());
      if (currentBalance < amount) {
        throw new Error('Insufficient balance');
      }

      // Update user balance
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          balance: {
            decrement: new Decimal(amount),
          },
        },
      });

      // Create transaction record
      const transaction = await tx.transaction.create({
        data: {
          user_id: userId,
          amount: new Decimal(amount),
          type: TransactionType.WITHDRAWAL,
          description: description || 'Balance withdrawal',
          balance_after: updatedUser.balance,
        },
      });

      return {
        balance: parseFloat(updatedUser.balance.toString()),
        transactionId: transaction.id,
      };
    });

    return result;
  }
}
