import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CacheService } from '../cache/cache.service';
import { UpdateUserDto } from './dto';
import { User } from './entities';
import { formatEther } from 'viem';
import { ConfigService } from '@nestjs/config';
import { MOCK_BTC_ABI } from '../shared/constants';
import { BlockchainService } from '../common';

@Injectable()
export class UsersService {
  private mockBtcAddress: `0x${string}`;
  private readonly BALANCE_CACHE_TTL = 30; // Cache balance for 30 seconds

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly cacheService: CacheService,
    private readonly blockchainService: BlockchainService,
  ) {
    this.mockBtcAddress = this.configService.getOrThrow<string>(
      'MOCK_BTC_ADDRESS',
    ) as `0x${string}`;
  }

  /**
   * Fetch both CORE and WBTC balances in parallel for better performance
   * With caching to reduce blockchain calls
   */
  private async fetchOnChainBalances(walletAddress: string) {
    const cacheKey = `balances:${walletAddress}`;

    // Try to get from cache first
    const cachedBalances = await this.cacheService.get<{
      coreBalance: number;
      wbtcBalance: number;
    }>(cacheKey);

    if (cachedBalances) {
      return cachedBalances;
    }

    const address = walletAddress as `0x${string}`;

    try {
      // Fetch both balances in parallel for better performance using BlockchainService
      const [coreBalanceResult, wbtcBalanceResult] = await Promise.all([
        this.blockchainService.getBalance(address),
        this.blockchainService.getTokenBalance(
          this.mockBtcAddress,
          address,
          MOCK_BTC_ABI as unknown as any[],
        ),
      ]);

      const balances = {
        coreBalance: Number(coreBalanceResult.formatted),
        wbtcBalance: Number(wbtcBalanceResult.formatted),
      };

      // Cache the result for better performance
      await this.cacheService.set(cacheKey, balances, this.BALANCE_CACHE_TTL);

      return balances;
    } catch (error) {
      console.error('Error fetching on-chain balances:', error);
      // Return zero balances as fallback
      return {
        coreBalance: 0,
        wbtcBalance: 0,
      };
    }
  }

  /**
   * Fetch BTC and CORE prices from Alchemy API
   */
  private async fetchTokenPrices(): Promise<{
    btcPrice: number;
    corePrice: number;
  }> {
    const pricesCacheKey = 'token_prices:BTC_CORE';

    // Try to get from cache first (cache for 60 seconds)
    const cachedPrices = await this.cacheService.get<{
      btcPrice: number;
      corePrice: number;
    }>(pricesCacheKey);

    if (cachedPrices) {
      return cachedPrices;
    }

    try {
      const alchemyApiKey =
        this.configService.getOrThrow<string>('ALCHEMY_API_KEY');

      const response = await fetch(
        'https://api.g.alchemy.com/prices/v1/tokens/by-symbol?symbols=BTC&symbols=CORE',
        {
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${alchemyApiKey}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch prices: ${response.statusText}`);
      }

      const priceData = await response.json();

      // Extract prices based on the API response structure
      const btcPrice = priceData.data[0].prices[0].value;
      const corePrice = priceData.data[1].prices[0].value;

      const prices = {
        btcPrice,
        corePrice,
      };

      // Cache prices for 60 seconds
      await this.cacheService.set(pricesCacheKey, prices, 60);

      return prices;
    } catch (error) {
      console.error('Error fetching token prices:', error);
      // Return fallback prices
      return {
        btcPrice: 0,
        corePrice: 0,
      };
    }
  }

  /**
   * Transform database user to API response format with on-chain balances
   */
  private async enrichUserWithBalances(
    user: any,
    walletAddress: string,
  ): Promise<User> {
    // Fetch both on-chain balances and token prices in parallel
    const [onChainBalances, tokenPrices] = await Promise.all([
      this.fetchOnChainBalances(walletAddress),
      this.fetchTokenPrices(),
    ]);

    // Calculate USD values
    const wbtcBalanceInUsd = onChainBalances.wbtcBalance * tokenPrices.btcPrice;
    const coreBalanceInUsd =
      onChainBalances.coreBalance * tokenPrices.corePrice;
    const balance = parseFloat(user.balance.toString());
    const totalAssetInUsd = balance + wbtcBalanceInUsd + coreBalanceInUsd;

    return {
      ...user,
      balance,
      ...onChainBalances,
      wbtcBalanceInUsd,
      coreBalanceInUsd,
      totalAssetInUsd,
    };
  }

  /**
   * Get current user by wallet address or create if doesn't exist
   * Returns user data with real-time on-chain balances
   * @param walletAddress - The wallet address to lookup/create user for
   * @returns Promise<User> - User object with USD balance and on-chain balances
   */
  async getCurrentUserOrCreate(walletAddress: string): Promise<User> {
    if (!this.blockchainService.isValidAddress(walletAddress)) {
      throw new ConflictException('Invalid wallet address format');
    }

    // Check if user with wallet address already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { wallet_address: walletAddress },
    });

    // If user already exists, return the user data with on-chain balances
    if (existingUser) {
      return this.enrichUserWithBalances(existingUser, walletAddress);
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

      return this.enrichUserWithBalances(newUser, walletAddress);
    } catch (error) {
      // Handle race condition if another user creates with the same wallet address
      // between the time of checking and creating
      if (error.code === 'P2002') {
        // Try to get the user that was just created by another request
        const user = await this.prisma.user.findUnique({
          where: { wallet_address: walletAddress },
        });

        if (user) {
          return this.enrichUserWithBalances(user, walletAddress);
        }
        throw new ConflictException('Wallet address already exists');
      }
      throw error;
    }
  }

  /**
   * Update user profile
   * @param walletAddress - The wallet address of the user to update
   * @param updateUserDto - The data to update
   * @returns Promise<User> - Updated user object with fresh on-chain balances
   */
  async updateCurrentUser(
    walletAddress: string,
    updateUserDto: UpdateUserDto,
  ): Promise<User> {
    if (!this.blockchainService.isValidAddress(walletAddress)) {
      throw new ConflictException('Invalid wallet address format');
    }

    try {
      const updatedUser = await this.prisma.user.update({
        where: { wallet_address: walletAddress },
        data: updateUserDto,
      });

      return this.enrichUserWithBalances(updatedUser, walletAddress);
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('User not found');
      }
      throw error;
    }
  }

  /**
   * Get transaction history for the current user
   * @param walletAddress - The wallet address of the user
   * @param limit - Number of transactions to return (default: 10)
   * @param offset - Number of transactions to skip (default: 0)
   * @returns Promise<Array> - Array of user transactions
   */
  async getTransactionHistory(walletAddress: string, limit = 10, offset = 0) {
    if (!this.blockchainService.isValidAddress(walletAddress)) {
      throw new ConflictException('Invalid wallet address format');
    }

    // Validate pagination parameters
    if (limit < 1 || limit > 100) {
      throw new ConflictException('Limit must be between 1 and 100');
    }

    if (offset < 0) {
      throw new ConflictException('Offset must be non-negative');
    }

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

  /**
   * Invalidate balance cache for a user (useful when balance changes)
   */
  async invalidateBalanceCache(walletAddress: string): Promise<void> {
    const cacheKey = `balances:${walletAddress}`;
    await this.cacheService.del(cacheKey);
  }
}
