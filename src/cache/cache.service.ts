import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class CacheService {
  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      console.info(`[CacheService] Getting value for key: ${key}`);
      const value = await this.cacheManager.get<T>(key);
      console.info(`[CacheService] Retrieved value for key: ${key}`, value);
      console.info(`[CacheService] Value type for key ${key}:`, typeof value);
      return value ?? null;
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set value in cache with optional TTL
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      if (ttl !== undefined) {
        await this.cacheManager.set(key, value, ttl);
      } else {
        await this.cacheManager.set(key, value);
      }
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
    }
  }

  /**
   * Delete value from cache
   */
  async del(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error);
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    try {
      await this.cacheManager.clear();
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }

  /**
   * Get multiple values from cache
   */
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    try {
      const promises = keys.map((key) => this.get<T>(key));
      return await Promise.all(promises);
    } catch (error) {
      console.error(`Cache mget error for keys ${keys.join(', ')}:`, error);
      return keys.map(() => null);
    }
  }

  /**
   * Set multiple values in cache
   */
  async mset<T>(
    keyValues: Array<{ key: string; value: T; ttl?: number }>,
  ): Promise<void> {
    try {
      const promises = keyValues.map(({ key, value, ttl }) =>
        this.set(key, value, ttl),
      );
      await Promise.all(promises);
    } catch (error) {
      console.error('Cache mset error:', error);
    }
  }

  /**
   * Check if key exists in cache
   */
  async has(key: string): Promise<boolean> {
    try {
      const value = await this.cacheManager.get(key);
      return value !== null && value !== undefined;
    } catch (error) {
      console.error(`Cache has error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get or set pattern - get from cache, if not exists, set from callback
   */
  async getOrSet<T>(
    key: string,
    callback: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    try {
      const cachedValue = await this.get<T>(key);
      if (cachedValue !== null) {
        return cachedValue;
      }

      const value = await callback();
      await this.set(key, value, ttl);
      return value;
    } catch (error) {
      console.error(`Cache getOrSet error for key ${key}:`, error);
      // Fallback to callback if cache fails
      return await callback();
    }
  }
}
