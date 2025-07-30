import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsString,
  Min,
  Max,
  IsIn,
} from 'class-validator';

export class CreateDepositDto {
  @ApiProperty({
    description: 'Amount to deposit in dollars',
    example: 100.0,
    minimum: 1,
    maximum: 10000,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1, { message: 'Minimum deposit amount is $1' })
  @Max(10000, { message: 'Maximum deposit amount is $10,000' })
  amount: number;

  @ApiProperty({
    description: 'Currency code',
    example: 'usd',
    default: 'usd',
    enum: ['usd'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['usd'], { message: 'Only USD currency is supported' })
  currency?: string = 'usd';

  @ApiProperty({
    description: 'Optional description for the deposit',
    example: 'Account top-up',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;
}
