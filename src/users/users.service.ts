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
      return existingUser;
    }

    // If user doesn't exist, create new user with auto-generated name
    const userName = `user-${walletAddress}`;

    try {
      return await this.prisma.user.create({
        data: {
          name: userName,
          wallet_address: walletAddress,
        },
      });
    } catch (error) {
      // Handle race condition if another user creates with the same wallet address
      // between the time of checking and creating
      if (error.code === 'P2002') {
        // Try to get the user that was just created by another request
        const user = await this.prisma.user.findUnique({
          where: { wallet_address: walletAddress },
        });
        if (user) {
          return user;
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
      return await this.prisma.user.update({
        where: { wallet_address: walletAddress },
        data: updateUserDto,
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('User not found');
      }
      throw error;
    }
  }
}
