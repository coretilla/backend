import {
  Controller,
  Get,
  Body,
  Patch,
  UseGuards,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto';
import { User } from './entities';
import { JwtAuthGuard, CurrentUser, AuthenticatedUser } from '../auth';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({
    summary: 'Get current user profile (login or create)',
    description:
      'Get current user profile based on JWT token with real-time on-chain balances. If user does not exist, it will be created automatically. Returns USD balance from database and live CORE/WBTC balances from blockchain.',
  })
  @ApiResponse({
    status: 200,
    description: 'Current user profile retrieved or created successfully',
    type: User,
    examples: {
      'existing-user': {
        summary: 'Existing user profile',
        value: {
          id: 1,
          name: 'John Doe',
          wallet_address: '0x742d35Cc6596B0C7c5d3D4e3b2b0C8C6e7D8E9F0',
          balance: 150.5,
          coreBalance: 1000,
          wbtcBalance: 0.5,
          wbtcBalanceInUsd: 48500.0,
          coreBalanceInUsd: 1200.0,
          totalAssetInUsd: 49850.5,
          created_at: '2025-01-29T10:30:00Z',
          updated_at: '2025-01-29T10:35:00Z',
        },
      },
      'new-user': {
        summary: 'New user with auto-generated name',
        value: {
          id: 2,
          name: 'user-0x742d35Cc6596B0C7c5d3D4e3b2b0C8C6e7D8E9F0',
          wallet_address: '0x742d35Cc6596B0C7c5d3D4e3b2b0C8C6e7D8E9F0',
          balance: 0,
          coreBalance: 0,
          wbtcBalance: 0,
          wbtcBalanceInUsd: 0,
          coreBalanceInUsd: 0,
          totalAssetInUsd: 0,
          created_at: '2025-08-03T10:30:00Z',
          updated_at: '2025-08-03T10:30:00Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
    examples: {
      'invalid-token': {
        summary: 'Invalid JWT token',
        value: {
          statusCode: 401,
          message: 'Unauthorized',
        },
      },
    },
  })
  async getCurrentUser(@CurrentUser() user: AuthenticatedUser): Promise<User> {
    return await this.usersService.getCurrentUserOrCreate(user.walletAddress);
  }

  @Patch('me')
  @ApiOperation({
    summary: 'Update current user profile',
    description:
      'Update current user profile based on JWT token with updated on-chain balances. Only name can be updated. Returns updated profile with real-time CORE/WBTC balances.',
  })
  @ApiBody({
    type: UpdateUserDto,
    examples: {
      'update-name': {
        summary: 'Update user name',
        description:
          'Only name field can be updated, wallet address is immutable',
        value: {
          name: 'New Name',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'User profile updated successfully',
    type: User,
    examples: {
      success: {
        summary: 'Successful profile update',
        value: {
          id: 1,
          name: 'New Name',
          wallet_address: '0x742d35Cc6596B0C7c5d3D4e3b2b0C8C6e7D8E9F0',
          balance: 150.5,
          coreBalance: 1000,
          wbtcBalance: 0.5,
          wbtcBalanceInUsd: 48500.0,
          coreBalanceInUsd: 1200.0,
          totalAssetInUsd: 49850.5,
          created_at: '2025-01-29T10:30:00Z',
          updated_at: '2025-08-03T11:00:00Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async updateCurrentUser(
    @CurrentUser() user: AuthenticatedUser,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<User> {
    return await this.usersService.updateCurrentUser(
      user.walletAddress,
      updateUserDto,
    );
  }

  @Get('me/transactions')
  @ApiOperation({
    summary: 'Get current user transaction history',
    description:
      'Get transaction history for the current authenticated user with pagination support.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of transactions to return (1-100, default: 10)',
    example: 10,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Number of transactions to skip (default: 0)',
    example: 0,
  })
  @ApiResponse({
    status: 200,
    description: 'Transaction history retrieved successfully',
    examples: {
      'transaction-history': {
        summary: 'User transaction history',
        value: [
          {
            id: 1,
            amount: 100.0,
            type: 'DEPOSIT',
            description: 'Deposit via Stripe',
            createdAt: '2025-01-29T10:30:00Z',
          },
          {
            id: 2,
            amount: 25.5,
            type: 'WITHDRAWAL',
            description: 'Purchase payment',
            createdAt: '2025-01-28T15:20:00Z',
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async getTransactionHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ) {
    const transactions = await this.usersService.getTransactionHistory(
      user.walletAddress,
      limit,
      offset,
    );

    return {
      success: true,
      data: transactions,
    };
  }
}
