import { GetLogsParameters, Log } from 'viem';

export interface GetLogsParams {
  address: `0x${string}`;
  event: any;
  args?: any;
  fromBlock?: bigint;
  toBlock?: bigint;
}

export interface ContractParams {
  address: `0x${string}`;
  abi: any;
  functionName: string;
  args: any[];
  account?: any;
}

export interface TokenBalanceResult {
  balance: bigint;
  formatted: string;
}

export interface BlockchainTransactionResult {
  hash: string;
  blockNumber?: bigint;
  status: 'success' | 'reverted';
}

export interface StakingEvent {
  transactionHash: string;
  blockNumber: string;
  amount: string;
}

export interface TokenPriceData {
  btcPrice: number;
  corePrice: number;
}
