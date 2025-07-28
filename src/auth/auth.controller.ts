import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SignInDto } from './dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get()
  getHello(): string {
    return this.authService.getHello();
  }

  @Get('nonce')
  @ApiOperation({
    summary: 'Generate nonce for wallet authentication',
    description:
      'Generates a unique nonce (UUID) for a wallet address and stores it in cache for 2 minutes. The nonce is used for wallet signature verification during authentication process.',
  })
  @ApiQuery({
    name: 'walletAddress',
    description:
      'The wallet address (e.g., Ethereum address) that will be used as cache key',
    example: '0x742d35Cc6634C0532925a3b8D404fddaF1f71d78',
    required: true,
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Nonce generated successfully',
    schema: {
      type: 'object',
      properties: {
        nonce: {
          type: 'string',
          format: 'uuid',
          description: 'Generated UUID nonce',
          example: '550e8400-e29b-41d4-a716-446655440000',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Missing or invalid wallet address',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Wallet address is required' },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  async getNonce(
    @Query('walletAddress') walletAddress: string,
  ): Promise<{ nonce: string }> {
    if (!walletAddress) {
      throw new BadRequestException('Wallet address is required');
    }

    const nonce = await this.authService.generateNonce(walletAddress);
    return { nonce };
  }

  @Post('signin')
  @ApiOperation({
    summary: 'Sign in with wallet signature',
    description:
      'Authenticates a user by verifying their wallet signature against the stored nonce. Returns an access token upon successful authentication.',
  })
  @ApiBody({
    type: SignInDto,
    description: 'Sign-in credentials including wallet address and signature',
  })
  @ApiResponse({
    status: 200,
    description: 'Sign-in successful',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Sign-in successful',
        },
        wallet_address: {
          type: 'string',
          example: '0x742d35Cc6634C0532925a3b8D404fddaF1f71d78',
        },
        access_token: {
          type: 'string',
          description: 'JWT access token',
          example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad Request - Missing, invalid credentials, or malformed data',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: {
          type: 'string',
          example: 'Invalid wallet address format',
        },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid signature or expired nonce',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: {
          type: 'string',
          example: 'Nonce not found or expired. Please request a new nonce',
        },
        error: { type: 'string', example: 'Unauthorized' },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal Server Error - Service temporarily unavailable',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 500 },
        message: {
          type: 'string',
          example: 'Authentication service temporarily unavailable',
        },
        error: { type: 'string', example: 'Internal Server Error' },
      },
    },
  })
  async signIn(@Body() signInDto: SignInDto): Promise<{
    message: string;
    wallet_address: string;
    access_token: string;
  }> {
    return await this.authService.signIn(
      signInDto.wallet_address,
      signInDto.signature,
    );
  }
}
