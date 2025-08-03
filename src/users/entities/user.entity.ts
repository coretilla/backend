import { ApiProperty } from '@nestjs/swagger';

export class User {
  @ApiProperty({
    description: 'User ID',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'User name',
    example: 'John Doe',
  })
  name: string;

  @ApiProperty({
    description: 'Ethereum wallet address',
    example: '0x742d35Cc6596B0C7c5d3D4e3b2b0C8C6e7D8E9F0',
  })
  wallet_address: string;

  @ApiProperty({
    description: 'User balance in USD',
    example: 150.5,
  })
  balance: number;

  @ApiProperty({
    description: 'User $CORE on-chain balance',
    example: 1000,
  })
  coreBalance: number;

  @ApiProperty({
    description: 'User WBTC on-chain balance',
    example: 0.5,
  })
  wbtcBalance: number;

  @ApiProperty({
    description: 'User WBTC balance in USD',
    example: 48500.0,
  })
  wbtcBalanceInUsd: number;

  @ApiProperty({
    description: 'User $CORE balance in USD',
    example: 1200.0,
  })
  coreBalanceInUsd: number;

  @ApiProperty({
    description:
      'Total assets in USD (balance + wbtcBalanceInUsd + coreBalanceInUsd)',
    example: 49850.5,
  })
  totalAssetInUsd: number;

  @ApiProperty({
    description: 'Account creation timestamp',
    example: '2025-01-29T10:30:00Z',
  })
  created_at: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2025-01-29T10:35:00Z',
  })
  updated_at: Date;
}
