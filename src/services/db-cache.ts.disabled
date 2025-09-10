import { getCacheManager, CacheStrategies } from '@/lib/cache';
import { createHash } from 'crypto';

export interface QueryCacheOptions {
  ttl?: number;
  tags?: string[];
  namespace?: string;
  invalidateOn?: string[]; // Table names that should invalidate this cache
  keyPrefix?: string;
  serialize?: boolean;
}

export interface QueryCacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalQueries: number;
  cacheSize: number;
}

/**
 * Database Query Cache Manager for FacePay
 */
export class DbCache {
  private cache: ReturnType<typeof getCacheManager>;
  private stats: { hits: number; misses: number; queries: number };
  private defaultTTL: number;

  constructor(options: { defaultTTL?: number } = {}) {
    this.cache = getCacheManager();
    this.stats = { hits: 0, misses: 0, queries: 0 };
    this.defaultTTL = options.defaultTTL || 1800; // 30 minutes default
  }

  /**
   * Cache a database query result
   */
  async cacheQuery<T = any>(
    query: string,
    params: any[] = [],
    executor: () => Promise<T>,
    options: QueryCacheOptions = {}
  ): Promise<T> {
    const cacheKey = this.generateQueryKey(query, params);
    const {
      ttl = this.defaultTTL,
      tags = ['db'],
      namespace = 'db_query',
    } = options;

    this.stats.queries++;

    try {
      // Try to get from cache
      const cached = await this.cache.get<T>(cacheKey, undefined, {
        namespace,
        tags,
      });

      if (cached !== null) {
        this.stats.hits++;
        console.log(`🎯 DB Cache HIT: ${cacheKey.substring(0, 50)}...`);
        return cached;
      }

      // Execute query
      this.stats.misses++;
      console.log(`🔍 DB Cache MISS: ${cacheKey.substring(0, 50)}...`);
      
      const result = await executor();

      // Cache the result
      await this.cache.set(cacheKey, result, {
        ttl,
        namespace,
        tags,
      });

      return result;
    } catch (error) {
      console.error('DB Cache error:', error);
      // Fallback to executing query without caching
      return await executor();
    }
  }

  /**
   * Cache Prisma query results
   */
  async cachePrismaQuery<T = any>(
    operation: string,
    model: string,
    args: any,
    executor: () => Promise<T>,
    options: QueryCacheOptions = {}
  ): Promise<T> {
    const queryIdentifier = `${operation}:${model}`;
    const cacheKey = this.generateQueryKey(queryIdentifier, [args]);
    const {
      ttl = this.defaultTTL,
      tags = ['db', model.toLowerCase()],
      namespace = 'prisma',
    } = options;

    this.stats.queries++;

    try {
      // Try to get from cache
      const cached = await this.cache.get<T>(cacheKey, undefined, {
        namespace,
        tags,
      });

      if (cached !== null) {
        this.stats.hits++;
        console.log(`🎯 Prisma Cache HIT: ${operation} ${model}`);
        return cached;
      }

      // Execute Prisma query
      this.stats.misses++;
      console.log(`🔍 Prisma Cache MISS: ${operation} ${model}`);
      
      const result = await executor();

      // Cache the result (don't cache null/undefined results)
      if (result !== null && result !== undefined) {
        await this.cache.set(cacheKey, result, {
          ttl,
          namespace,
          tags,
        });
      }

      return result;
    } catch (error) {
      console.error('Prisma Cache error:', error);
      // Fallback to executing query without caching
      return await executor();
    }
  }

  /**
   * Invalidate cache by table/model names
   */
  async invalidateByTables(tables: string[]): Promise<number> {
    try {
      const tags = tables.map(table => table.toLowerCase());
      return await this.cache.invalidateByTags(tags);
    } catch (error) {
      console.error('Cache invalidation by tables error:', error);
      return 0;
    }
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidateByPattern(pattern: string, namespace: string = 'db_query'): Promise<number> {
    try {
      return await this.cache.deletePattern(pattern, namespace);
    } catch (error) {
      console.error('Cache invalidation by pattern error:', error);
      return 0;
    }
  }

  /**
   * Warm cache with frequently used queries
   */
  async warmCache(warmupQueries: Array<{
    key: string;
    executor: () => Promise<any>;
    options?: QueryCacheOptions;
  }>): Promise<void> {
    console.log(`🔥 Warming DB cache with ${warmupQueries.length} queries...`);

    const promises = warmupQueries.map(async ({ key, executor, options = {} }) => {
      try {
        const result = await executor();
        const cacheKey = this.generateQueryKey(key, []);
        const {
          ttl = this.defaultTTL,
          tags = ['db', 'warmup'],
          namespace = 'db_query',
        } = options;

        await this.cache.set(cacheKey, result, { ttl, namespace, tags });
        console.log(`✅ Warmed cache for: ${key}`);
      } catch (error) {
        console.error(`❌ Failed to warm cache for ${key}:`, error);
      }
    });

    await Promise.all(promises);
    console.log('🔥 DB cache warming completed');
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<QueryCacheStats> {
    const cacheStats = await this.cache.getStats();
    const hitRate = this.stats.queries > 0 
      ? (this.stats.hits / this.stats.queries) * 100 
      : 0;

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: Math.round(hitRate * 100) / 100,
      totalQueries: this.stats.queries,
      cacheSize: cacheStats.totalKeys,
    };
  }

  /**
   * Clear all database cache
   */
  async clearCache(namespace?: string): Promise<boolean> {
    try {
      await this.cache.clear(namespace || 'db_query');
      this.stats = { hits: 0, misses: 0, queries: 0 };
      return true;
    } catch (error) {
      console.error('Clear cache error:', error);
      return false;
    }
  }

  /**
   * Generate cache key for query
   */
  private generateQueryKey(query: string, params: any[] = []): string {
    const paramsString = JSON.stringify(params);
    const fullQuery = `${query}:${paramsString}`;
    
    // Hash long queries to keep key length manageable
    if (fullQuery.length > 200) {
      return createHash('sha256').update(fullQuery).digest('hex');
    }
    
    return fullQuery.replace(/\s+/g, ' ').trim();
  }
}

// Singleton instance
let dbCache: DbCache | null = null;

/**
 * Get the global database cache instance
 */
export function getDbCache(): DbCache {
  if (!dbCache) {
    dbCache = new DbCache();
  }
  return dbCache;
}

/**
 * Decorator for caching Prisma operations
 */
export function cachePrismaOperation(options: QueryCacheOptions = {}) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const dbCache = getDbCache();
      const operation = propertyName;
      const model = this.constructor.name.replace('Service', '');

      return dbCache.cachePrismaQuery(
        operation,
        model,
        args,
        () => originalMethod.apply(this, args),
        options
      );
    };

    return descriptor;
  };
}

/**
 * Cached Prisma Client wrapper
 */
export class CachedPrismaClient {
  private cache: DbCache;

  constructor(private prisma: any) {
    this.cache = getDbCache();
  }

  /**
   * Cached findMany operation
   */
  async findMany<T = any>(
    model: string,
    args: any = {},
    options: QueryCacheOptions = {}
  ): Promise<T[]> {
    return this.cache.cachePrismaQuery(
      'findMany',
      model,
      args,
      () => this.prisma[model].findMany(args),
      {
        ...CacheStrategies.DATABASE_QUERY,
        ...options,
        tags: ['db', model.toLowerCase(), ...(options.tags || [])],
      }
    );
  }

  /**
   * Cached findUnique operation
   */
  async findUnique<T = any>(
    model: string,
    args: any,
    options: QueryCacheOptions = {}
  ): Promise<T | null> {
    return this.cache.cachePrismaQuery(
      'findUnique',
      model,
      args,
      () => this.prisma[model].findUnique(args),
      {
        ...CacheStrategies.DATABASE_QUERY,
        ...options,
        tags: ['db', model.toLowerCase(), ...(options.tags || [])],
      }
    );
  }

  /**
   * Cached findFirst operation
   */
  async findFirst<T = any>(
    model: string,
    args: any = {},
    options: QueryCacheOptions = {}
  ): Promise<T | null> {
    return this.cache.cachePrismaQuery(
      'findFirst',
      model,
      args,
      () => this.prisma[model].findFirst(args),
      {
        ...CacheStrategies.DATABASE_QUERY,
        ...options,
        tags: ['db', model.toLowerCase(), ...(options.tags || [])],
      }
    );
  }

  /**
   * Cached count operation
   */
  async count(
    model: string,
    args: any = {},
    options: QueryCacheOptions = {}
  ): Promise<number> {
    return this.cache.cachePrismaQuery(
      'count',
      model,
      args,
      () => this.prisma[model].count(args),
      {
        ttl: 300, // 5 minutes for counts
        ...options,
        tags: ['db', model.toLowerCase(), 'count', ...(options.tags || [])],
      }
    );
  }

  /**
   * Cached aggregate operation
   */
  async aggregate<T = any>(
    model: string,
    args: any,
    options: QueryCacheOptions = {}
  ): Promise<T> {
    return this.cache.cachePrismaQuery(
      'aggregate',
      model,
      args,
      () => this.prisma[model].aggregate(args),
      {
        ttl: 600, // 10 minutes for aggregations
        ...options,
        tags: ['db', model.toLowerCase(), 'aggregate', ...(options.tags || [])],
      }
    );
  }

  /**
   * Create operation (with cache invalidation)
   */
  async create<T = any>(
    model: string,
    args: any,
    options: { invalidateTags?: string[] } = {}
  ): Promise<T> {
    const result = await this.prisma[model].create(args);
    
    // Invalidate related cache
    const tagsToInvalidate = [
      'db',
      model.toLowerCase(),
      ...(options.invalidateTags || [])
    ];
    
    await this.cache.invalidateByTables(tagsToInvalidate);
    console.log(`🗑️  Invalidated cache for tags: ${tagsToInvalidate.join(', ')}`);
    
    return result;
  }

  /**
   * Update operation (with cache invalidation)
   */
  async update<T = any>(
    model: string,
    args: any,
    options: { invalidateTags?: string[] } = {}
  ): Promise<T> {
    const result = await this.prisma[model].update(args);
    
    // Invalidate related cache
    const tagsToInvalidate = [
      'db',
      model.toLowerCase(),
      ...(options.invalidateTags || [])
    ];
    
    await this.cache.invalidateByTables(tagsToInvalidate);
    console.log(`🗑️  Invalidated cache for tags: ${tagsToInvalidate.join(', ')}`);
    
    return result;
  }

  /**
   * Delete operation (with cache invalidation)
   */
  async delete<T = any>(
    model: string,
    args: any,
    options: { invalidateTags?: string[] } = {}
  ): Promise<T> {
    const result = await this.prisma[model].delete(args);
    
    // Invalidate related cache
    const tagsToInvalidate = [
      'db',
      model.toLowerCase(),
      ...(options.invalidateTags || [])
    ];
    
    await this.cache.invalidateByTables(tagsToInvalidate);
    console.log(`🗑️  Invalidated cache for tags: ${tagsToInvalidate.join(', ')}`);
    
    return result;
  }
}

/**
 * Query cache configurations for different types of data
 */
export const QueryCacheConfigs = {
  // User data (medium TTL)
  USER: {
    ttl: 3600, // 1 hour
    tags: ['db', 'user'],
  },

  // Payment data (short TTL for security)
  PAYMENT: {
    ttl: 300, // 5 minutes
    tags: ['db', 'payment'],
  },

  // Session data (short TTL)
  SESSION: {
    ttl: 600, // 10 minutes
    tags: ['db', 'session'],
  },

  // Static/reference data (long TTL)
  REFERENCE: {
    ttl: 86400, // 24 hours
    tags: ['db', 'reference', 'static'],
  },

  // Analytics/stats (medium TTL)
  ANALYTICS: {
    ttl: 1800, // 30 minutes
    tags: ['db', 'analytics'],
  },

  // Biometric data (very short TTL for security)
  BIOMETRIC: {
    ttl: 60, // 1 minute
    tags: ['db', 'biometric'],
  },
} as const;

/**
 * Automatic cache invalidation based on table changes
 */
export async function setupCacheInvalidationTriggers(): Promise<void> {
  // This would typically be called during application startup
  // to set up database triggers or event listeners for cache invalidation
  console.log('🔄 Setting up cache invalidation triggers...');
  
  // Example: Listen for database events and invalidate cache accordingly
  // This could be implemented using database triggers, event sourcing,
  // or application-level event listeners
}

export default {
  DbCache,
  getDbCache,
  CachedPrismaClient,
  cachePrismaOperation,
  QueryCacheConfigs,
  setupCacheInvalidationTriggers,
};