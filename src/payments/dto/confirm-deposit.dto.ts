import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class ConfirmDepositDto {
  @ApiProperty({
    description: 'Stripe Payment Intent ID',
    example: 'pi_1234567890abcdef',
  })
  @IsString()
  @IsNotEmpty()
  payment_intent_id: string;

  @ApiProperty({
    description: 'Stripe Payment Method ID',
    example: 'pm_1234567890abcdef',
  })
  @IsString()
  @IsNotEmpty()
  payment_method_id: string;
}
