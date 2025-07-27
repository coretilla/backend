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
}
