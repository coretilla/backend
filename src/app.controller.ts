import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';
import { PrismaService } from './database/prisma.service';
import { CacheInterceptor, CacheKey, CacheTTL } from './cache';

@ApiTags('App')
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @UseInterceptors(CacheInterceptor)
  @CacheKey('hello')
  @CacheTTL(60000) // 1 minute
  @ApiOperation({
    summary: 'Get hello message',
    description: 'Public endpoint - No authentication required',
  })
  @ApiResponse({
    status: 200,
    description: 'Hello message',
    schema: {
      type: 'string',
      example: 'Hello World!',
    },
  })
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  @UseInterceptors(CacheInterceptor)
  @CacheKey('health-check')
  @CacheTTL(30000) // 30 seconds
  @ApiOperation({
    summary: 'Health check endpoint',
    description:
      'Check application and database connectivity - No authentication required',
  })
  @ApiResponse({
    status: 200,
    description: 'Application health status',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        database: { type: 'string', example: 'connected' },
        timestamp: { type: 'string', example: '2025-07-26T12:00:00.000Z' },
      },
    },
  })
  async healthCheck() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ok',
        database: 'connected',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'error',
        database: 'disconnected',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }
}
