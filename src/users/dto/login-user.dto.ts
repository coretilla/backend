import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  Length,
  Matches,
  IsOptional,
} from 'class-validator';

export class LoginUserDto {
  @ApiProperty({
    description: `User name (optional)
    
    - If provided: Uses the provided name
    - If not provided: Automatically generates name using format 'user-{wallet_address}'
    - If user already exists: This field is ignored`,
    example: 'John Doe',
    maxLength: 100,
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(1, 100, {
    message: 'Name must be between 1 and 100 characters long',
  })
  name?: string;

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
