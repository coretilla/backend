import {
  IsNumber,
  IsPositive,
  Min,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SwapDto {
  @ApiPropertyOptional({
    description: 'Wallet address (automatically taken from JWT token)',
    example: '0x1234567890123456789012345678901234567890',
  })
  @IsOptional()
  @IsString()
  walletAddress?: string;

  @ApiProperty({
    description: 'Amount in USD to swap for BTC',
    example: 100.5,
    minimum: 0.001,
  })
  @IsNumber({}, { message: 'Amount must be a valid number' })
  @IsPositive({ message: 'Amount must be positive' })
  @Min(0.001, { message: 'Minimum swap amount is 0.001' })
  amount: number;
}
