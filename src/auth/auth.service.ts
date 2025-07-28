import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CacheService } from '../cache';
import { v4 as uuidv4 } from 'uuid';
import { SignableMessage, verifyMessage } from 'viem';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly cacheService: CacheService,
    private readonly jwtService: JwtService,
  ) {}

  getHello(): string {
    return 'hello world';
  }

  async generateNonce(walletAddress: string): Promise<string> {
    const nonce = uuidv4();
    const cacheKey = `nonce:${walletAddress}`;

    // Store nonce in cache with 2 minutes TTL (120 seconds)
    await this.cacheService.set(cacheKey, nonce, 120);

    return nonce;
  }

  async signIn(wallet_address: string, signature: string) {
    try {
      // Validate input parameters
      if (!wallet_address || !signature) {
        throw new BadRequestException(
          'Wallet address and signature are required',
        );
      }

      // Validate wallet address format
      if (!/^0x[a-fA-F0-9]{40}$/.test(wallet_address)) {
        throw new BadRequestException('Invalid wallet address format');
      }

      // Validate signature format
      if (!/^0x[a-fA-F0-9]{130}$/.test(signature)) {
        throw new BadRequestException('Invalid signature format');
      }

      const cacheKey = `nonce:${wallet_address}`;

      // Get nonce from cache
      let nonce: string | null;
      try {
        nonce = await this.cacheService.get<string>(cacheKey);
      } catch (error) {
        this.logger.error(
          `Failed to retrieve nonce from cache: ${error.message}`,
        );
        throw new InternalServerErrorException(
          'Authentication service temporarily unavailable',
        );
      }

      if (!nonce) {
        throw new UnauthorizedException(
          'Nonce not found or expired. Please request a new nonce',
        );
      }

      // Verify signature
      let isValid: boolean;
      try {
        isValid = await verifyMessage({
          address: wallet_address as `0x${string}`,
          message: nonce as SignableMessage,
          signature: signature as `0x${string}`,
        });
      } catch (error) {
        this.logger.error(`Signature verification failed: ${error.message}`);
        throw new UnauthorizedException(
          'Invalid signature format or verification failed',
        );
      }

      if (!isValid) {
        this.logger.warn(
          `Invalid signature attempt for wallet: ${wallet_address}`,
        );
        throw new UnauthorizedException('Invalid signature');
      }

      // Remove nonce after successful verification to prevent replay attacks
      try {
        await this.cacheService.del(cacheKey);
      } catch (error) {
        this.logger.warn(`Failed to delete nonce from cache: ${error.message}`);
        // Don't throw error here, authentication was successful
      }

      // Generate JWT token
      const payload = { sub: wallet_address };
      let access_token: string;
      try {
        access_token = await this.jwtService.signAsync(payload);
      } catch (error) {
        this.logger.error(`Failed to generate JWT token: ${error.message}`);
        throw new InternalServerErrorException(
          'Failed to generate access token',
        );
      }

      this.logger.log(`Successful sign-in for wallet: ${wallet_address}`);

      return {
        message: 'Sign-in successful',
        wallet_address,
        access_token,
      };
    } catch (error) {
      // Re-throw known errors
      if (
        error instanceof BadRequestException ||
        error instanceof UnauthorizedException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }

      // Handle unexpected errors
      this.logger.error(
        `Unexpected error during sign-in: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'An unexpected error occurred during authentication',
      );
    }
  }
}
