import { ApiProperty } from '@nestjs/swagger';
import { DepositStatus } from '@prisma/client';

export class Deposit {
  @ApiProperty({
    description: 'Deposit ID',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'User ID',
    example: 1,
  })
  user_id: number;

  @ApiProperty({
    description: 'Stripe Payment Intent ID',
    example: 'pi_1234567890abcdef',
  })
  stripe_payment_intent_id: string;

  @ApiProperty({
    description: 'Deposit amount in dollars',
    example: 100.0,
  })
  amount: number;

  @ApiProperty({
    description: 'Currency code',
    example: 'usd',
  })
  currency: string;

  @ApiProperty({
    description: 'Deposit status',
    enum: DepositStatus,
    example: DepositStatus.PENDING,
  })
  status: DepositStatus;

  @ApiProperty({
    description: 'Stripe client secret for frontend',
    example: 'pi_1234567890abcdef_secret_xyz',
    nullable: true,
  })
  stripe_client_secret?: string;

  @ApiProperty({
    description: 'Additional metadata',
    example: { description: 'Account top-up' },
    nullable: true,
  })
  metadata?: any;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2025-01-29T10:30:00Z',
  })
  created_at: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2025-01-29T10:35:00Z',
  })
  updated_at: Date;
}
