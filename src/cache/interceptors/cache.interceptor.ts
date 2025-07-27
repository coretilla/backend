import {
  Injectable,
  ExecutionContext,
  CallHandler,
  NestInterceptor,
  Inject,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Reflector } from '@nestjs/core';
import { CACHE_KEY_METADATA, CACHE_TTL_METADATA } from '../decorators';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly reflector: Reflector,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();

    // Only cache GET requests
    if (request.method !== 'GET') {
      return next.handle();
    }

    const cacheKey = this.getCacheKey(context);
    const ttl = this.getTTL(context);

    if (!cacheKey) {
      return next.handle();
    }

    try {
      // Try to get from cache
      const cachedData = await this.cacheManager.get(cacheKey);
      if (cachedData) {
        console.log(`Cache HIT for key: ${cacheKey}`);
        return of(cachedData);
      }

      console.log(`Cache MISS for key: ${cacheKey}`);

      // Execute handler and cache the result
      return next.handle().pipe(
        tap(async (data) => {
          try {
            if (ttl !== undefined) {
              await this.cacheManager.set(cacheKey, data, ttl);
            } else {
              await this.cacheManager.set(cacheKey, data);
            }
            console.log(`Cache SET for key: ${cacheKey}`);
          } catch (error) {
            console.error(`Cache set error for key ${cacheKey}:`, error);
          }
        }),
      );
    } catch (error) {
      console.error(`Cache interceptor error for key ${cacheKey}:`, error);
      return next.handle();
    }
  }

  private getCacheKey(context: ExecutionContext): string | undefined {
    // Check for custom cache key from decorator
    const customKey = this.reflector.get<string>(
      CACHE_KEY_METADATA,
      context.getHandler(),
    );

    if (customKey) {
      return customKey;
    }

    // Generate key from request URL and params
    const request = context.switchToHttp().getRequest();
    const { url, params, query } = request;

    // Simple key generation
    const keyParts = [url];

    if (Object.keys(params).length > 0) {
      keyParts.push(JSON.stringify(params));
    }

    if (Object.keys(query).length > 0) {
      keyParts.push(JSON.stringify(query));
    }

    return keyParts.join(':');
  }

  private getTTL(context: ExecutionContext): number | undefined {
    return this.reflector.get<number>(CACHE_TTL_METADATA, context.getHandler());
  }
}
