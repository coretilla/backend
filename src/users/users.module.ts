import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { CacheModule } from '../cache/cache.module';
import { BlockchainService } from '../common';

@Module({
  imports: [CacheModule],
  controllers: [UsersController],
  providers: [UsersService, BlockchainService],
  exports: [UsersService],
})
export class UsersModule {}
