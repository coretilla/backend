import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class LoginUserDto {
  @ApiProperty({
    description: `Ethereum wallet address (always required)
    
    Must be a valid Ethereum address starting with '0x' followed by 40 hexadecimal characters`,
    example: '0x742d35Cc6596B0C7c5d3D4e3b2b0C8C6e7D8E9F0',
    pattern: '^0x[a-fA-F0-9]{40}$',
    minLength: 42,
    maxLength: 42,
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^0x[a-fA-F0-9]{40}$/, {
    message: 'wallet_address must be a valid Ethereum address',
  })
  wallet_address: string;
}
