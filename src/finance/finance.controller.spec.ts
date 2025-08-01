import { Test, TestingModule } from '@nestjs/testing';
import { FinanceController } from './finance.controller';
import { FinanceService } from './finance.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('FinanceController', () => {
  let controller: FinanceController;
  let service: FinanceService;

  const mockFinanceService = {
    swap: jest.fn(),
  };

  const mockUser = {
    id: 1,
    walletAddress: '0x1234567890123456789012345678901234567890',
    balance: 1000,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FinanceController],
      providers: [
        {
          provide: FinanceService,
          useValue: mockFinanceService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<FinanceController>(FinanceController);
    service = module.get<FinanceService>(FinanceService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('swap', () => {
    it('should successfully swap USD to BTC', async () => {
      const swapDto = { amount: 100 };
      const expectedResult = {
        transactionHash: '0xabc123',
        btcAmount: 0.002,
        btcPrice: 50000,
        usdAmount: 100,
        remainingBalance: 900,
      };

      mockFinanceService.swap.mockResolvedValue(expectedResult);

      const result = await controller.swap(swapDto, mockUser);

      expect(service.swap).toHaveBeenCalledWith({
        walletAddress: mockUser.walletAddress,
        amount: swapDto.amount,
      });
      expect(result).toEqual({
        success: true,
        message: 'Swap completed successfully',
        data: expectedResult,
      });
    });

    it('should handle insufficient balance error', async () => {
      const swapDto = { amount: 1500 };

      mockFinanceService.swap.mockRejectedValue(
        new BadRequestException('Insufficient balance'),
      );

      await expect(controller.swap(swapDto, mockUser)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should handle user not found error', async () => {
      const swapDto = { amount: 100 };

      mockFinanceService.swap.mockRejectedValue(
        new NotFoundException('User not found'),
      );

      await expect(controller.swap(swapDto, mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
