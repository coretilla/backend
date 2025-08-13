import { Module } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { FinanceController } from './finance.controller';
import { CacheModule } from '../cache';
import { BlockchainService } from '../common';

@Module({
  imports: [CacheModule],
  controllers: [FinanceController],
  providers: [FinanceService, BlockchainService],
  exports: [FinanceService],
})
export class FinanceModule {}
