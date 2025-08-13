import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createPublicClient,
  createWalletClient,
  http,
  PublicClient,
  WalletClient,
  formatEther,
  parseEther,
  parseAbi,
  parseAbiItem,
} from 'viem';
import { coreDao } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import {
  GetLogsParams,
  ContractParams,
  TokenBalanceResult,
  BlockchainTransactionResult,
  StakingEvent,
} from '../interfaces';

@Injectable()
export class BlockchainService {
  private readonly logger = new Logger(BlockchainService.name);
  private publicClient: PublicClient;
  private walletClient: WalletClient;
  private account: any;

  constructor(private readonly configService: ConfigService) {
    this.initializeClients();
  }

  /**
   * Initialize blockchain clients once during service instantiation
   */
  private initializeClients(): void {
    try {
      // Initialize public client for reading blockchain data
      this.publicClient = createPublicClient({
        chain: coreDao,
        transport: http(),
      });

      // Initialize wallet client for transactions (if private key is available)
      const privateKey = this.configService.get<string>('WALLET_PRIVATE_KEY');
      if (privateKey) {
        this.account = privateKeyToAccount(privateKey as `0x${string}`);
        this.walletClient = createWalletClient({
          account: this.account,
          chain: coreDao,
          transport: http(),
        });
      }

      this.logger.log('Blockchain clients initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize blockchain clients', error);
      throw error;
    }
  }

  /**
   * Get the public client instance
   */
  getPublicClient(): PublicClient {
    return this.publicClient;
  }

  /**
   * Get the wallet client instance
   */
  getWalletClient(): WalletClient {
    if (!this.walletClient) {
      throw new Error('Wallet client not initialized. Private key required.');
    }
    return this.walletClient;
  }

  /**
   * Get native token balance (CORE) for an address
   */
  async getBalance(address: string): Promise<TokenBalanceResult> {
    try {
      const balance = await this.publicClient.getBalance({
        address: address as `0x${string}`,
      });

      return {
        balance,
        formatted: formatEther(balance),
      };
    } catch (error) {
      this.logger.error(`Failed to get balance for ${address}`, error);
      throw error;
    }
  }

  /**
   * Get ERC20 token balance for an address
   */
  async getTokenBalance(
    tokenAddress: string,
    userAddress: string,
    abi: any[],
  ): Promise<TokenBalanceResult> {
    try {
      const balance = (await this.publicClient.readContract({
        address: tokenAddress as `0x${string}`,
        abi,
        functionName: 'balanceOf',
        args: [userAddress],
      })) as unknown as bigint;

      return {
        balance,
        formatted: formatEther(balance),
      };
    } catch (error) {
      this.logger.error(
        `Failed to get token balance for ${userAddress} at ${tokenAddress}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get logs from blockchain with filtering
   */
  async getLogs(params: GetLogsParams): Promise<any[]> {
    try {
      const logs = await this.publicClient.getLogs({
        address: params.address,
        event: params.event,
        args: params.args,
        fromBlock: params.fromBlock,
        toBlock: params.toBlock,
      });

      return logs;
    } catch (error) {
      this.logger.error('Failed to get logs', error);
      throw error;
    }
  }

  /**
   * Get latest block number
   */
  async getLatestBlockNumber(): Promise<bigint> {
    try {
      return await this.publicClient.getBlockNumber();
    } catch (error) {
      this.logger.error('Failed to get latest block number', error);
      throw error;
    }
  }

  /**
   * Simulate contract execution before actual transaction
   */
  async simulateContract(params: ContractParams): Promise<any> {
    try {
      const { request } = await this.publicClient.simulateContract({
        address: params.address,
        abi: params.abi,
        functionName: params.functionName,
        args: params.args,
        account: params.account || this.account,
      });

      return request;
    } catch (error) {
      this.logger.error('Contract simulation failed', error);
      throw error;
    }
  }

  /**
   * Execute a contract write operation
   */
  async executeContract(params: ContractParams): Promise<string> {
    try {
      if (!this.walletClient) {
        throw new Error('Wallet client not available for contract execution');
      }

      // First simulate the contract
      const request = await this.simulateContract(params);

      // Execute the transaction
      const hash = await this.walletClient.writeContract(request);

      this.logger.log(`Contract executed successfully: ${hash}`);
      return hash;
    } catch (error) {
      this.logger.error('Contract execution failed', error);
      throw error;
    }
  }

  /**
   * Get staking history for a wallet address
   */
  async getStakingHistory(
    stakingVaultAddress: string,
    walletAddress: string,
    fromBlock: bigint = 6916746n,
  ): Promise<StakingEvent[]> {
    try {
      const latestBlock = await this.getLatestBlockNumber();

      const stakingHistory = await this.getLogs({
        address: stakingVaultAddress as `0x${string}`,
        event: parseAbiItem(
          'event Staked(address indexed user, uint256 amount)',
        ),
        args: {
          user: walletAddress as `0x${string}`,
        },
        fromBlock,
        toBlock: latestBlock,
      });

      return stakingHistory.map((log) => ({
        transactionHash: log.transactionHash,
        blockNumber: log.blockNumber.toString(),
        amount: formatEther(log.args.amount || 0n),
      }));
    } catch (error) {
      this.logger.error(
        `Failed to get staking history for ${walletAddress}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Format token amount from wei to human readable
   */
  formatTokenAmount(amount: bigint, decimals: number = 18): string {
    if (decimals === 18) {
      return formatEther(amount);
    }
    // For other decimals, we can implement custom formatting
    const divisor = BigInt(10 ** decimals);
    const quotient = amount / divisor;
    const remainder = amount % divisor;
    const remainderString = remainder.toString().padStart(decimals, '0');
    const trimmedRemainder = remainderString.replace(/0+$/, '');

    if (trimmedRemainder === '') {
      return quotient.toString();
    }
    return `${quotient.toString()}.${trimmedRemainder}`;
  }

  /**
   * Convert decimal number to BigInt wei (18 decimals)
   */
  convertToWei(amount: number): bigint {
    try {
      // Convert to string with fixed precision to avoid floating point issues
      const amountStr = amount.toFixed(18);
      return parseEther(amountStr);
    } catch (error) {
      this.logger.error(`Failed to convert ${amount} to wei`, error);
      throw new Error(`Invalid amount: ${amount}`);
    }
  }

  /**
   * Validate if address is a valid Ethereum address
   */
  isValidAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }
}
