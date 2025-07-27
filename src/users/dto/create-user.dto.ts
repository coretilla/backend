import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({
    description: 'User name',
    example: 'John Doe',
    maxLength: 100,
  })
  @IsNotEmpty()
  @IsString()
  @Length(1, 100)
  name: string;

  @ApiProperty({
    description: 'Ethereum wallet address',
    example: '0x742d35Cc6596B0C7c5d3D4e3b2b0C8C6e7D8E9F0',
    pattern: '^0x[a-fA-F0-9]{40}$',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^0x[a-fA-F0-9]{40}$/, {
    message: 'wallet_address must be a valid Ethereum address',
  })
  wallet_address: string;
}
