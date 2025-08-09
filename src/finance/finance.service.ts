import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
  Logger,
  Inject,
} from '@nestjs/common';
import { SwapDto } from './dto';
import { PrismaService } from 'src/database';
import { ConfigService } from '@nestjs/config';
import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
  parseAbiItem,
  formatEther,
} from 'viem';
import { coreTestnet2 } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { MOCK_BTC_ABI } from '../shared/constants';
import { Decimal } from '@prisma/client/runtime/library';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';

@Injectable()
export class FinanceService {
  private readonly logger = new Logger(FinanceService.name);
  private readonly BTC_PRICE_CACHE_KEY = 'btc_price';
  private readonly BTC_PRICE_CACHE_TTL = 30; // 30 seconds

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async swap(swapDto: SwapDto) {
    const { walletAddress, amount } = swapDto;

    try {
      this.logger.log(
        `Starting swap for wallet: ${walletAddress}, amount: ${amount}`,
      );

      // Validate input
      if (!walletAddress || !amount || amount <= 0) {
        throw new BadRequestException('Invalid wallet address or amount');
      }

      // Check if user exists and has sufficient balance
      const user = await this.prisma.user.findUnique({
        where: { wallet_address: walletAddress },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (user.balance.lt(amount)) {
        throw new BadRequestException('Insufficient balance');
      }

      // Get Bitcoin price
      const btcPriceData = await this.getBitcoinPrice();
      const btcPriceUSD = btcPriceData.data[0].prices[0].value;

      this.logger.log(`Current BTC price: $${btcPriceUSD}`);

      // Calculate BTC amount to send (assuming amount is in USD)
      const btcAmount = amount / btcPriceUSD;

      // Perform blockchain transaction
      const transactionHash = await this.executeBlockchainTransaction(
        walletAddress,
        btcAmount,
      );

      // Update user balance in database transaction
      await this.prisma.$transaction(async (prisma) => {
        // Decrease user's balance
        await prisma.user.update({
          where: { wallet_address: walletAddress },
          data: { balance: { decrement: amount } },
        });

        // Create transaction record
        await prisma.transaction.create({
          data: {
            user_id: user.id,
            type: 'SWAP',
            amount: new Decimal(amount),
            btc_amount: new Decimal(btcAmount),
            btc_price: new Decimal(btcPriceUSD),
            transaction_hash: transactionHash,
            status: 'COMPLETED',
            balance_after: user.balance.sub(amount),
            description: `Swap USD to BTC`,
          },
        });
      });

      this.logger.log(`Swap completed successfully: ${transactionHash}`);

      return {
        transactionHash,
        btcAmount,
        btcPrice: btcPriceUSD,
        usdAmount: amount,
        remainingBalance: user.balance.sub(amount).toNumber(),
      };
    } catch (error) {
      this.logger.error(
        `Swap failed for wallet: ${walletAddress}`,
        error.stack,
      );

      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      throw new InternalServerErrorException('Swap transaction failed');
    }
  }

  async getStakeHistory(walletAddress: string) {
    try {
      this.logger.log(`Fetching stake history for wallet: ${walletAddress}`);

      // Check if STAKING_VAULT_ADDRESS is configured
      const stakingVaultAddress = this.configService.get<string>(
        'STAKING_VAULT_ADDRESS',
      );
      if (!stakingVaultAddress) {
        throw new InternalServerErrorException(
          'Staking vault address not configured',
        );
      }

      const publicClient = createPublicClient({
        chain: coreTestnet2,
        transport: http(),
      });

      const latestBlock = await publicClient.getBlockNumber();
      this.logger.log(`Latest block number: ${latestBlock}`);

      const stakingHistory = await publicClient.getLogs({
        address: stakingVaultAddress as `0x${string}`,
        event: parseAbiItem(
          'event Staked(address indexed user, uint256 amount)',
        ),
        args: {
          user: walletAddress as `0x${string}`,
        },
        fromBlock: 6916746n,
        toBlock: latestBlock,
      });

      console.log('Staking History:', stakingHistory);

      const formattedHistory = stakingHistory.map((log) => ({
        transactionHash: log.transactionHash,
        blockNumber: log.blockNumber.toString(),
        amount: formatEther(log.args.amount || 0n),
      }));

      return formattedHistory;
    } catch (error) {
      this.logger.error(
        `Failed to fetch stake history for wallet: ${walletAddress}`,
        error.stack,
      );

      if (error instanceof InternalServerErrorException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Failed to retrieve staking history',
      );
    }
  }

  async getCollateralDeposit(walletAddress: string) {
    try {
      this.logger.log(
        `Fetching collateral deposit history for wallet: ${walletAddress}`,
      );

      // Validate wallet address
      if (!walletAddress || !walletAddress.startsWith('0x')) {
        throw new BadRequestException('Invalid wallet address format');
      }

      // Check if LENDING_POOL_ADDRESS is configured
      const lendingPoolAddress = this.configService.get<string>(
        'LENDING_POOL_ADDRESS',
      );
      if (!lendingPoolAddress) {
        throw new InternalServerErrorException(
          'Lending pool address not configured',
        );
      }

      const publicClient = createPublicClient({
        chain: coreTestnet2,
        transport: http(),
      });

      const latestBlock = await publicClient.getBlockNumber();
      this.logger.log(`Latest block number: ${latestBlock}`);

      const depositHistory = await publicClient.getLogs({
        address: lendingPoolAddress as `0x${string}`,
        event: parseAbiItem(
          'event CollateralDeposited(address indexed user, uint256 btcAmount)',
        ),
        args: {
          user: walletAddress as `0x${string}`,
        },
        fromBlock: 6916746n,
        toBlock: latestBlock,
      });

      this.logger.log(
        `Found ${depositHistory.length} collateral deposits for ${walletAddress}`,
      );

      const formattedHistory = depositHistory.map((log) => ({
        transactionHash: log.transactionHash,
        blockNumber: log.blockNumber.toString(),
        btcAmount: formatEther(log.args.btcAmount || 0n),
      }));

      return formattedHistory;
    } catch (error) {
      this.logger.error(
        `Failed to fetch collateral deposit history for wallet: ${walletAddress}`,
        error.stack,
      );

      if (
        error instanceof BadRequestException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Failed to retrieve collateral deposit history',
      );
    }
  }

  async getBtcPrice() {
    return this.getBitcoinPrice();
  }

  private async getBitcoinPrice() {
    try {
      // Check cache first
      const cachedPrice = await this.cacheManager.get(this.BTC_PRICE_CACHE_KEY);
      if (cachedPrice) {
        this.logger.log('Using cached BTC price');
        return cachedPrice;
      }

      const alchemyApiKey =
        this.configService.getOrThrow<string>('ALCHEMY_API_KEY');

      const response = await fetch(
        'https://api.g.alchemy.com/prices/v1/tokens/by-symbol?symbols=BTC',
        {
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${alchemyApiKey}`,
          },
        },
      );

      if (!response.ok) {
        throw new InternalServerErrorException('Failed to fetch Bitcoin price');
      }

      const priceData = await response.json();

      // Cache the price for 30 seconds
      await this.cacheManager.set(
        this.BTC_PRICE_CACHE_KEY,
        priceData,
        this.BTC_PRICE_CACHE_TTL * 1000,
      );

      return priceData;
    } catch (error) {
      this.logger.error('Failed to get Bitcoin price', error);
      throw new InternalServerErrorException(
        'Unable to get current Bitcoin price',
      );
    }
  }

  private async executeBlockchainTransaction(
    walletAddress: string,
    btcAmount: number,
  ): Promise<string> {
    try {
      const privateKey = this.configService.get<string>('VAULT_1_PRIVATE_KEY');

      if (!privateKey) {
        throw new InternalServerErrorException(
          'Vault private key not configured',
        );
      }

      const account = privateKeyToAccount(privateKey as `0x${string}`);

      const publicClient = createPublicClient({
        chain: coreTestnet2,
        transport: http(),
      });

      const walletClient = createWalletClient({
        account,
        chain: coreTestnet2,
        transport: http(),
      });

      // Convert BTC amount to wei (18 decimals) with proper precision handling
      const btcAmountWei = this.convertToWei(btcAmount);

      this.logger.log(
        `Converting ${btcAmount} BTC to ${btcAmountWei.toString()} wei`,
      );

      // Simulate contract interaction
      const { request } = await publicClient.simulateContract({
        account,
        address: this.configService.getOrThrow<string>(
          'MOCK_BTC_ADDRESS',
        ) as `0x${string}`,
        abi: MOCK_BTC_ABI,
        functionName: 'transfer',
        args: [walletAddress as `0x${string}`, btcAmountWei],
      });

      // Execute the transaction
      const hash = await walletClient.writeContract(request);

      this.logger.log(`Blockchain transaction sent: ${hash}`);

      return hash;
    } catch (error) {
      this.logger.error('Blockchain transaction failed', error);
      throw new InternalServerErrorException(
        'Failed to execute blockchain transaction',
      );
    }
  }

  /**
   * Convert decimal number to BigInt wei (18 decimals)
   * Handles precision properly to avoid BigInt conversion errors
   */
  private convertToWei(amount: number): bigint {
    try {
      // Convert to string with fixed precision to avoid floating point issues
      const amountStr = amount.toFixed(18);

      // Split by decimal point
      const [integerPart, decimalPart = ''] = amountStr.split('.');

      // Pad decimal part to 18 digits
      const paddedDecimal = decimalPart.padEnd(18, '0');

      // Combine integer and decimal parts
      const weiString = integerPart + paddedDecimal;

      return BigInt(weiString);
    } catch (error) {
      this.logger.error(`Failed to convert ${amount} to wei`, error);
      throw new InternalServerErrorException('Amount conversion failed');
    }
  }
}
