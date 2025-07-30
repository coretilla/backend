import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreateDepositDto, ConfirmDepositDto } from './dto';
import { JwtAuthGuard, CurrentUser, AuthenticatedUser } from '../auth';
import { DepositStatus } from '@prisma/client';

@ApiTags('Payments')
@Controller('payments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('deposits')
  @ApiOperation({
    summary: 'Create a new deposit',
    description: 'Create a new deposit intent using Stripe payment system',
  })
  @ApiBody({
    type: CreateDepositDto,
    examples: {
      'basic-deposit': {
        summary: 'Basic deposit',
        description: 'Create a $100 deposit',
        value: {
          amount: 100.0,
          currency: 'usd',
          description: 'Account top-up',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Deposit created successfully',
    schema: {
      type: 'object',
      properties: {
        deposit_id: { type: 'number', example: 1 },
        client_secret: { type: 'string', example: 'pi_1234567890_secret_xyz' },
        amount: { type: 'number', example: 100.0 },
        currency: { type: 'string', example: 'usd' },
        status: { type: 'string', example: 'PENDING' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid deposit data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async createDeposit(
    @CurrentUser() user: AuthenticatedUser,
    @Body() createDepositDto: CreateDepositDto,
  ): Promise<{
    deposit_id: number;
    client_secret: string;
    amount: number;
    currency: string;
    status: DepositStatus;
  }> {
    return await this.paymentsService.createDeposit(
      user.walletAddress,
      createDepositDto,
    );
  }

  @Post('deposits/confirm')
  @ApiOperation({
    summary: 'Confirm a deposit payment',
    description:
      'Confirm a deposit payment after successful payment with Stripe',
  })
  @ApiBody({
    type: ConfirmDepositDto,
    examples: {
      'confirm-deposit': {
        summary: 'Confirm deposit',
        description: 'Confirm a deposit payment',
        value: {
          payment_intent_id: 'pi_1234567890abcdef',
          payment_method_id: 'pm_1234567890abcdef',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Deposit confirmed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        deposit_id: { type: 'number', example: 1 },
        new_balance: { type: 'number', example: 250.0 },
        transaction_id: { type: 'number', example: 5 },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid confirmation data or payment failed',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'Deposit not found',
  })
  async confirmDeposit(
    @CurrentUser() user: AuthenticatedUser,
    @Body() confirmDepositDto: ConfirmDepositDto,
  ): Promise<{
    success: boolean;
    deposit_id: number;
    new_balance: number;
    transaction_id: number;
  }> {
    return await this.paymentsService.confirmDeposit(
      user.walletAddress,
      confirmDepositDto,
    );
  }

  @Get('deposits/:id')
  @ApiOperation({
    summary: 'Get deposit by ID',
    description: 'Retrieve a specific deposit by its ID',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'Deposit ID',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Deposit retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number', example: 1 },
        amount: { type: 'number', example: 100.0 },
        currency: { type: 'string', example: 'usd' },
        status: { type: 'string', example: 'COMPLETED' },
        created_at: { type: 'string', example: '2025-01-29T10:30:00Z' },
        updated_at: { type: 'string', example: '2025-01-29T10:35:00Z' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'Deposit not found',
  })
  async getDeposit(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{
    id: number;
    amount: number;
    currency: string;
    status: DepositStatus;
    created_at: Date;
    updated_at: Date;
  }> {
    return await this.paymentsService.getDeposit(user.walletAddress, id);
  }

  @Get('deposits')
  @ApiOperation({
    summary: 'Get user deposits',
    description:
      'Retrieve all deposits for the authenticated user with pagination',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10, max: 50)',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Deposits retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        deposits: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number', example: 1 },
              amount: { type: 'number', example: 100.0 },
              currency: { type: 'string', example: 'usd' },
              status: { type: 'string', example: 'COMPLETED' },
              created_at: { type: 'string', example: '2025-01-29T10:30:00Z' },
              updated_at: { type: 'string', example: '2025-01-29T10:35:00Z' },
            },
          },
        },
        total: { type: 'number', example: 15 },
        page: { type: 'number', example: 1 },
        totalPages: { type: 'number', example: 2 },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async getUserDeposits(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ): Promise<{
    deposits: any[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 10));

    return await this.paymentsService.getUserDeposits(
      user.walletAddress,
      pageNum,
      limitNum,
    );
  }
}
