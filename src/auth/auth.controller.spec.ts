import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CacheService } from '../cache';
import { privateKeyToAccount } from 'viem/accounts';
import { SignInDto } from './dto';

describe('AuthController', () => {
  let authController: AuthController;
  let authService: AuthService;
  let cacheService: CacheService;
  let jwtService: JwtService;

  // Test wallet credentials
  const TEST_WALLET_ADDRESS = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
  const TEST_PRIVATE_KEY =
    '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' as `0x${string}`;
  const testAccount = privateKeyToAccount(TEST_PRIVATE_KEY);

  beforeEach(async () => {
    const mockCacheService = {
      set: jest.fn(),
      get: jest.fn(),
      del: jest.fn(),
    };

    const mockJwtService = {
      signAsync: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        AuthService,
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    authController = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
    cacheService = module.get<CacheService>(CacheService);
    jwtService = module.get<JwtService>(JwtService);
  });

  describe('getHello', () => {
    it('should return hello world', () => {
      expect(authController.getHello()).toBe('hello world');
    });
  });

  describe('getNonce', () => {
    it('should generate and return a nonce for valid wallet address', async () => {
      const mockNonce = '550e8400-e29b-41d4-a716-446655440000';
      jest.spyOn(cacheService, 'set').mockResolvedValue(undefined);
      jest.spyOn(authService, 'generateNonce').mockResolvedValue(mockNonce);

      const result = await authController.getNonce(TEST_WALLET_ADDRESS);

      expect(result).toEqual({ nonce: mockNonce });
      expect(authService.generateNonce).toHaveBeenCalledWith(
        TEST_WALLET_ADDRESS,
      );
    });

    it('should throw BadRequestException when wallet address is missing', async () => {
      await expect(authController.getNonce('')).rejects.toThrow(
        new BadRequestException('Wallet address is required'),
      );
    });

    it('should throw BadRequestException when wallet address is undefined', async () => {
      await expect(authController.getNonce(undefined as any)).rejects.toThrow(
        new BadRequestException('Wallet address is required'),
      );
    });
  });

  describe('signIn', () => {
    it('should successfully sign in with valid signature', async () => {
      // Step 1: Generate nonce
      const mockNonce = 'test-nonce-uuid';
      const cacheKey = `nonce:${TEST_WALLET_ADDRESS}`;

      jest.spyOn(cacheService, 'set').mockResolvedValue(undefined);
      jest.spyOn(cacheService, 'get').mockResolvedValue(mockNonce);
      jest.spyOn(cacheService, 'del').mockResolvedValue(undefined);

      const mockAccessToken = 'mock.jwt.token';
      jest.spyOn(jwtService, 'signAsync').mockResolvedValue(mockAccessToken);

      // Step 2: Sign the nonce with the private key
      const signature = await testAccount.signMessage({
        message: mockNonce,
      });

      // Step 3: Create signin DTO
      const signInDto: SignInDto = {
        wallet_address: TEST_WALLET_ADDRESS,
        signature: signature,
      };

      // Step 4: Call signIn
      const result = await authController.signIn(signInDto);

      // Step 5: Verify result
      expect(result).toEqual({
        message: 'Sign-in successful',
        wallet_address: TEST_WALLET_ADDRESS,
        access_token: mockAccessToken,
      });

      // Verify cache operations
      expect(cacheService.get).toHaveBeenCalledWith(cacheKey);
      expect(cacheService.del).toHaveBeenCalledWith(cacheKey);
      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: TEST_WALLET_ADDRESS,
      });
    });

    it('should throw UnauthorizedException when nonce is not found', async () => {
      const signature = await testAccount.signMessage({
        message: 'some-message',
      });

      const signInDto: SignInDto = {
        wallet_address: TEST_WALLET_ADDRESS,
        signature: signature,
      };

      // Mock cache to return null (nonce not found)
      jest.spyOn(cacheService, 'get').mockResolvedValue(null);

      await expect(authController.signIn(signInDto)).rejects.toThrow(
        new UnauthorizedException(
          'Nonce not found or expired. Please request a new nonce',
        ),
      );
    });

    it('should throw UnauthorizedException with invalid signature', async () => {
      const mockNonce = 'test-nonce-uuid';
      const cacheKey = `nonce:${TEST_WALLET_ADDRESS}`;

      jest.spyOn(cacheService, 'get').mockResolvedValue(mockNonce);

      // Create a signature for different message (invalid)
      const invalidSignature = await testAccount.signMessage({
        message: 'different-message',
      });

      const signInDto: SignInDto = {
        wallet_address: TEST_WALLET_ADDRESS,
        signature: invalidSignature,
      };

      await expect(authController.signIn(signInDto)).rejects.toThrow(
        new UnauthorizedException('Invalid signature'),
      );
    });

    it('should throw BadRequestException with invalid wallet address format', async () => {
      const signature = await testAccount.signMessage({
        message: 'test-message',
      });

      const signInDto: SignInDto = {
        wallet_address: 'invalid-address',
        signature: signature,
      };

      await expect(authController.signIn(signInDto)).rejects.toThrow(
        new BadRequestException('Invalid wallet address format'),
      );
    });

    it('should throw BadRequestException with invalid signature format', async () => {
      const signInDto: SignInDto = {
        wallet_address: TEST_WALLET_ADDRESS,
        signature: 'invalid-signature',
      };

      await expect(authController.signIn(signInDto)).rejects.toThrow(
        new BadRequestException('Invalid signature format'),
      );
    });

    it('should throw BadRequestException when wallet_address is missing', async () => {
      const signature = await testAccount.signMessage({
        message: 'test-message',
      });

      const signInDto: SignInDto = {
        wallet_address: '',
        signature: signature,
      };

      await expect(authController.signIn(signInDto)).rejects.toThrow(
        new BadRequestException('Wallet address and signature are required'),
      );
    });

    it('should throw BadRequestException when signature is missing', async () => {
      const signInDto: SignInDto = {
        wallet_address: TEST_WALLET_ADDRESS,
        signature: '',
      };

      await expect(authController.signIn(signInDto)).rejects.toThrow(
        new BadRequestException('Wallet address and signature are required'),
      );
    });
  });

  describe('Integration Test - Full Authentication Flow', () => {
    it('should complete full authentication flow successfully', async () => {
      // Mock cache and JWT service
      let storedNonce: string;
      jest
        .spyOn(cacheService, 'set')
        .mockImplementation(async (key: string, value: string) => {
          storedNonce = value;
          return undefined;
        });

      jest
        .spyOn(cacheService, 'get')
        .mockImplementation(async (key: string) => {
          return storedNonce || null;
        });

      jest.spyOn(cacheService, 'del').mockResolvedValue(undefined);

      const mockAccessToken = 'integration.test.jwt.token';
      jest.spyOn(jwtService, 'signAsync').mockResolvedValue(mockAccessToken);

      // Step 1: Get nonce
      const nonceResult = await authController.getNonce(TEST_WALLET_ADDRESS);
      expect(nonceResult.nonce).toBeDefined();
      expect(typeof nonceResult.nonce).toBe('string');

      // Step 2: Sign the nonce
      const signature = await testAccount.signMessage({
        message: nonceResult.nonce,
      });

      // Step 3: Sign in with the signature
      const signInDto: SignInDto = {
        wallet_address: TEST_WALLET_ADDRESS,
        signature: signature,
      };

      const signInResult = await authController.signIn(signInDto);

      // Step 4: Verify successful authentication
      expect(signInResult).toEqual({
        message: 'Sign-in successful',
        wallet_address: TEST_WALLET_ADDRESS,
        access_token: mockAccessToken,
      });

      // Verify that nonce was deleted after use (preventing replay attacks)
      expect(cacheService.del).toHaveBeenCalledWith(
        `nonce:${TEST_WALLET_ADDRESS}`,
      );
    });

    it('should prevent replay attacks by invalidating used nonce', async () => {
      // Mock cache and JWT service
      let storedNonce: string | null;
      jest
        .spyOn(cacheService, 'set')
        .mockImplementation(async (key: string, value: string) => {
          storedNonce = value;
          return undefined;
        });

      jest
        .spyOn(cacheService, 'get')
        .mockImplementation(async (key: string) => {
          return storedNonce;
        });

      jest
        .spyOn(cacheService, 'del')
        .mockImplementation(async (key: string) => {
          storedNonce = null;
          return undefined;
        });

      const mockAccessToken = 'replay.test.jwt.token';
      jest.spyOn(jwtService, 'signAsync').mockResolvedValue(mockAccessToken);

      // Step 1: Get nonce
      const nonceResult = await authController.getNonce(TEST_WALLET_ADDRESS);

      // Step 2: Sign the nonce
      const signature = await testAccount.signMessage({
        message: nonceResult.nonce,
      });

      const signInDto: SignInDto = {
        wallet_address: TEST_WALLET_ADDRESS,
        signature: signature,
      };

      // Step 3: First sign in should succeed
      const firstSignIn = await authController.signIn(signInDto);
      expect(firstSignIn.message).toBe('Sign-in successful');

      // Step 4: Second sign in with same signature should fail (replay attack)
      await expect(authController.signIn(signInDto)).rejects.toThrow(
        new UnauthorizedException(
          'Nonce not found or expired. Please request a new nonce',
        ),
      );
    });
  });
});
