import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { UpdateUserDto } from './dto';
import { User } from './entities';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getCurrentUserOrCreate(walletAddress: string): Promise<User> {
    // Check if user with wallet address already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { wallet_address: walletAddress },
    });

    // If user already exists, return the user data
    if (existingUser) {
      return {
        ...existingUser,
        balance: parseFloat(existingUser.balance.toString()),
      };
    }

    // If user doesn't exist, create new user with auto-generated name
    const userName = `user-${walletAddress}`;

    try {
      const newUser = await this.prisma.user.create({
        data: {
          name: userName,
          wallet_address: walletAddress,
        },
      });
      return {
        ...newUser,
        balance: parseFloat(newUser.balance.toString()),
      };
    } catch (error) {
      // Handle race condition if another user creates with the same wallet address
      // between the time of checking and creating
      if (error.code === 'P2002') {
        // Try to get the user that was just created by another request
        const user = await this.prisma.user.findUnique({
          where: { wallet_address: walletAddress },
        });
        if (user) {
          return {
            ...user,
            balance: parseFloat(user.balance.toString()),
          };
        }
        throw new ConflictException('Wallet address already exists');
      }
      throw error;
    }
  }

  async updateCurrentUser(
    walletAddress: string,
    updateUserDto: UpdateUserDto,
  ): Promise<User> {
    try {
      const updatedUser = await this.prisma.user.update({
        where: { wallet_address: walletAddress },
        data: updateUserDto,
      });
      return {
        ...updatedUser,
        balance: parseFloat(updatedUser.balance.toString()),
      };
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('User not found');
      }
      throw error;
    }
  }

  /**
   * Get transaction history for the current user
   */
  async getTransactionHistory(walletAddress: string, limit = 10, offset = 0) {
    // Get user first
    const user = await this.prisma.user.findUnique({
      where: { wallet_address: walletAddress },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const transactions = await this.prisma.transaction.findMany({
      where: { user_id: user.id },
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: offset,
    });

    return transactions.map((transaction) => ({
      id: transaction.id,
      amount: parseFloat(transaction.amount.toString()),
      type: transaction.type,
      description: transaction.description,
      createdAt: transaction.created_at,
    }));
  }
}
