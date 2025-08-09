import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpStatus,
  HttpCode,
  Logger,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { FinanceService } from './finance.service';
import { SwapDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

@ApiTags('Finance')
@Controller('finance')
export class FinanceController {
  private readonly logger = new Logger(FinanceController.name);

  constructor(private readonly financeService: FinanceService) {}

  @Get('btc-price')
  @ApiOperation({
    summary: 'Get current BTC price',
    description: 'Get current Bitcoin price in USD (public endpoint)',
  })
  @ApiResponse({
    status: 200,
    description: 'Current BTC price retrieved successfully',
    example: {
      success: true,
      data: {
        symbol: 'BTC',
        price: 45000.0,
        currency: 'USD',
        timestamp: '2025-08-01T20:10:00.000Z',
      },
    },
  })
  async getBtcPrice() {
    try {
      const priceData = await this.financeService.getBtcPrice();
      const price = priceData.data[0].prices[0].value;

      return {
        success: true,
        data: {
          symbol: 'BTC',
          price: price,
          currency: 'USD',
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      this.logger.error('Failed to get BTC price', error.stack);
      throw error;
    }
  }

  @Post('swap')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Swap USD balance to BTC',
    description:
      'Convert USD balance from user account to BTC and send to their wallet address',
  })
  @ApiBody({
    type: SwapDto,
    description: 'Swap request details',
    examples: {
      example1: {
        summary: 'Basic swap request',
        value: {
          amount: 100.5,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Swap completed successfully',
    example: {
      success: true,
      message: 'Swap completed successfully',
      data: {
        transactionHash: '0x1234567890abcdef...',
        btcAmount: 0.00123456,
        btcPrice: 45000.0,
        usdAmount: 100.5,
        remainingBalance: 899.5,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid amount or insufficient balance',
    example: {
      statusCode: 400,
      message: 'Insufficient balance',
      error: 'Bad Request',
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error - Swap transaction failed',
  })
  async swap(@Body() swapDto: SwapDto, @CurrentUser() user: AuthenticatedUser) {
    this.logger.log(
      `Swap request from user: ${user.walletAddress}, amount: ${swapDto.amount}`,
    );

    try {
      const result = await this.financeService.swap({
        walletAddress: user.walletAddress,
        amount: swapDto.amount,
      });

      this.logger.log(
        `Swap completed successfully for user: ${user.walletAddress}`,
      );

      return {
        success: true,
        message: 'Swap completed successfully',
        data: result,
      };
    } catch (error) {
      this.logger.error(
        `Swap failed for user: ${user.walletAddress}`,
        error.stack,
      );
      throw error;
    }
  }

  @Get('stake-history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get staking history',
    description:
      'Retrieve staking history for the authenticated user wallet address from the blockchain',
  })
  @ApiResponse({
    status: 200,
    description: 'Staking history retrieved successfully',
    example: {
      success: true,
      data: [
        {
          transactionHash: '0x1234567890abcdef...',
          blockNumber: '6916750',
          amount: '1.0',
        },
      ],
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error - Failed to retrieve staking history',
    example: {
      statusCode: 500,
      message: 'Failed to retrieve staking history',
      error: 'Internal Server Error',
    },
  })
  async getStakeHistory(@CurrentUser() user: AuthenticatedUser) {
    const walletAddress = user.walletAddress;
    this.logger.log(`Stake history request for wallet: ${walletAddress}`);

    try {
      const stakeHistory =
        await this.financeService.getStakeHistory(walletAddress);

      this.logger.log(
        `Stake history retrieved successfully for wallet: ${walletAddress}`,
      );

      return {
        success: true,
        data: stakeHistory,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get stake history for wallet: ${walletAddress}`,
        error.stack,
      );
      throw error;
    }
  }

  @Get('collateral-deposit-history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Get collateral deposit history',
    description:
      'Retrieve collateral deposit history for the authenticated user wallet address from the blockchain',
  })
  @ApiResponse({
    status: 200,
    description: 'Collateral deposit history retrieved successfully',
    example: {
      success: true,
      data: [
        {
          transactionHash: '0x1234567890abcdef...',
          blockNumber: '6916750',
          btcAmount: '0.5',
        },
      ],
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid wallet address format',
    example: {
      statusCode: 400,
      message: 'Invalid wallet address format',
      error: 'Bad Request',
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 500,
    description:
      'Internal server error - Failed to retrieve collateral deposit history',
    example: {
      statusCode: 500,
      message: 'Failed to retrieve collateral deposit history',
      error: 'Internal Server Error',
    },
  })
  async getCollateralDepositHistory(@CurrentUser() user: AuthenticatedUser) {
    const walletAddress = user.walletAddress;
    this.logger.log(
      `Collateral deposit history request for wallet: ${walletAddress}`,
    );

    try {
      const depositHistory =
        await this.financeService.getCollateralDeposit(walletAddress);

      this.logger.log(
        `Collateral deposit history retrieved successfully for wallet: ${walletAddress}`,
      );

      return {
        success: true,
        data: depositHistory,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get collateral deposit history for wallet: ${walletAddress}`,
        error.stack,
      );
      throw error;
    }
  }
}
