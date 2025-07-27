import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateUserDto, UpdateUserDto, LoginUserDto } from './dto';
import { User } from './entities';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) { }

  async create(createUserDto: CreateUserDto): Promise<User> {
    try {
      return await this.prisma.user.create({
        data: createUserDto,
      });
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('Wallet address already exists');
      }
      throw error;
    }
  }

  async findAll(): Promise<User[]> {
    return await this.prisma.user.findMany({
      orderBy: {
        id: 'asc',
      },
    });
  }

  async findOne(id: number): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async findByWalletAddress(walletAddress: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { wallet_address: walletAddress },
    });

    if (!user) {
      throw new NotFoundException(
        `User with wallet address ${walletAddress} not found`,
      );
    }

    return user;
  }

  async loginOrCreate(loginUserDto: LoginUserDto): Promise<User> {
    // Check if user with wallet address already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { wallet_address: loginUserDto.wallet_address },
    });

    // If user already exists, return the user data
    if (existingUser) {
      return existingUser;
    }

    // If user doesn't exist, create new user
    // If name is not provided, generate auto name with format user-{wallet_address}
    const userName = loginUserDto.name || `user-${loginUserDto.wallet_address}`;

    try {
      return await this.prisma.user.create({
        data: {
          name: userName,
          wallet_address: loginUserDto.wallet_address,
        },
      });
    } catch (error) {
      // Handle race condition if another user creates with the same wallet address
      // between the time of checking and creating
      if (error.code === 'P2002') {
        // Try to get the user that was just created by another request
        const user = await this.prisma.user.findUnique({
          where: { wallet_address: loginUserDto.wallet_address },
        });
        if (user) {
          return user;
        }
        throw new ConflictException('Wallet address already exists');
      }
      throw error;
    }
  }

  private async updateUser(where: any, data: UpdateUserDto): Promise<User> {
    try {
      return await this.prisma.user.update({ where, data });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('User not found');
      }
      throw error;
    }
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    return this.updateUser({ id }, updateUserDto);
  }

  async updateByWalletAddress(walletAddress: string, updateUserDto: UpdateUserDto): Promise<User> {
    return this.updateUser({ wallet_address: walletAddress }, updateUserDto);
  }

}
