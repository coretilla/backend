import { ApiProperty } from '@nestjs/swagger';
import { TransactionType } from '@prisma/client';

export class Transaction {
  @ApiProperty({
    description: 'Transaction ID',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'User ID',
    example: 1,
  })
  user_id: number;

  @ApiProperty({
    description: 'Transaction type',
    enum: TransactionType,
    example: TransactionType.DEPOSIT,
  })
  type: TransactionType;

  @ApiProperty({
    description: 'Transaction amount in dollars',
    example: 100.0,
  })
  amount: number;

  @ApiProperty({
    description: 'Transaction description',
    example: 'Deposit via Stripe',
    nullable: true,
  })
  description?: string;

  @ApiProperty({
    description: 'Reference ID (e.g., deposit_id)',
    example: 'deposit_123',
    nullable: true,
  })
  reference_id?: string;

  @ApiProperty({
    description: 'User balance after this transaction',
    example: 150.0,
  })
  balance_after: number;

  @ApiProperty({
    description: 'Additional metadata',
    example: { stripe_payment_intent_id: 'pi_1234567890abcdef' },
    nullable: true,
  })
  metadata?: any;

  @ApiProperty({
    description: 'Transaction timestamp',
    example: '2025-01-29T10:30:00Z',
  })
  created_at: Date;
}
