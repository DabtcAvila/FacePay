import { NextRequest, NextResponse } from 'next/server';
import { getCacheManager, CacheStrategies } from '@/lib/cache';
import { createHash } from 'crypto';

export interface CacheMiddlewareOptions {
  ttl?: number;
  varyBy?: string[]; // Headers to vary cache by
  skipCacheFor?: string[]; // Methods to skip caching for
  namespace?: string;
  tags?: string[];
  condition?: (req: NextRequest) => boolean;
}

/**
 * HTTP Response Cache Middleware
 */
export function cacheMiddleware(options: CacheMiddlewareOptions = {}) {
  const {
    ttl = 300, // 5 minutes default
    varyBy = [],
    skipCacheFor = ['POST', 'PUT', 'DELETE', 'PATCH'],
    namespace = 'http',
    tags = ['http'],
    condition
  } = options;

  return async function (req: NextRequest, res: NextResponse) {
    // Skip caching for certain methods
    if (skipCacheFor.includes(req.method)) {
      return res;
    }

    // Check custom condition
    if (condition && !condition(req)) {
      return res;
    }

    const cache = getCacheManager();
    const cacheKey = generateHttpCacheKey(req, varyBy);

    try {
      // Try to get cached response
      const cachedResponse = await cache.get<{
        status: number;
        headers: Record<string, string>;
        body: string;
      }>(cacheKey, undefined, { namespace, tags });

      if (cachedResponse) {
        // Return cached response
        const response = new NextResponse(cachedResponse.body, {
          status: cachedResponse.status,
          headers: {
            ...cachedResponse.headers,
            'X-Cache': 'HIT',
            'X-Cache-Key': cacheKey,
          }
        });
        return response;
      }

      // Clone response to cache it
      const responseClone = res.clone();
      const body = await responseClone.text();

      // Cache successful responses only
      if (res.status >= 200 && res.status < 300) {
        const responseData = {
          status: res.status,
          headers: Object.fromEntries(res.headers.entries()),
          body,
        };

        await cache.set(cacheKey, responseData, { ttl, namespace, tags });
      }

      // Add cache headers to original response
      res.headers.set('X-Cache', 'MISS');
      res.headers.set('X-Cache-Key', cacheKey);

      return res;
    } catch (error) {
      console.error('Cache middleware error:', error);
      return res;
    }
  };
}

/**
 * API Route Cache Wrapper
 */
export function withApiCache<T = any>(
  handler: (req: NextRequest) => Promise<NextResponse>,
  options: CacheMiddlewareOptions = {}
) {
  return async function (req: NextRequest): Promise<NextResponse> {
    const {
      ttl = 300,
      varyBy = [],
      skipCacheFor = ['POST', 'PUT', 'DELETE', 'PATCH'],
      namespace = 'api',
      tags = ['api'],
      condition
    } = options;

    // Skip caching for certain methods
    if (skipCacheFor.includes(req.method)) {
      return handler(req);
    }

    // Check custom condition
    if (condition && !condition(req)) {
      return handler(req);
    }

    const cache = getCacheManager();
    const cacheKey = generateHttpCacheKey(req, varyBy);

    try {
      // Try to get cached response
      const cachedResponse = await cache.get<{
        status: number;
        headers: Record<string, string>;
        body: string;
      }>(cacheKey, undefined, { namespace, tags });

      if (cachedResponse) {
        return new NextResponse(cachedResponse.body, {
          status: cachedResponse.status,
          headers: {
            ...cachedResponse.headers,
            'X-Cache': 'HIT',
            'X-Cache-Key': cacheKey,
            'Content-Type': cachedResponse.headers['content-type'] || 'application/json',
          }
        });
      }

      // Execute handler
      const response = await handler(req);

      // Cache successful responses only
      if (response.status >= 200 && response.status < 300) {
        const body = await response.text();
        const responseData = {
          status: response.status,
          headers: Object.fromEntries(response.headers.entries()),
          body,
        };

        await cache.set(cacheKey, responseData, { ttl, namespace, tags });

        // Return new response with cache headers
        return new NextResponse(body, {
          status: response.status,
          headers: {
            ...Object.fromEntries(response.headers.entries()),
            'X-Cache': 'MISS',
            'X-Cache-Key': cacheKey,
          }
        });
      }

      return response;
    } catch (error) {
      console.error('API cache wrapper error:', error);
      return handler(req);
    }
  };
}

/**
 * Database Query Cache Decorator
 */
export function withDbCache<T extends any[], R>(
  queryName: string,
  options: { ttl?: number; tags?: string[] } = {}
) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const { ttl = 1800, tags = ['db'] } = options; // 30 minutes default

    descriptor.value = async function (...args: T): Promise<R> {
      const cache = getCacheManager();
      const cacheKey = `${queryName}:${createHash('sha256').update(JSON.stringify(args)).digest('hex')}`;

      try {
        // Try to get from cache
        const cachedResult = await cache.get<R>(cacheKey, undefined, {
          namespace: 'db',
          tags,
        });

        if (cachedResult !== null) {
          return cachedResult;
        }

        // Execute original query
        const result = await originalMethod.apply(this, args);

        // Cache the result
        await cache.set(cacheKey, result, {
          ttl,
          namespace: 'db',
          tags,
        });

        return result;
      } catch (error) {
        console.error('DB cache error:', error);
        // Fallback to original method
        return originalMethod.apply(this, args);
      }
    };

    return descriptor;
  };
}

/**
 * Rate Limiting Middleware with Redis
 */
export function rateLimitMiddleware(options: {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: NextRequest) => string;
  skipFor?: (req: NextRequest) => boolean;
  onLimitReached?: (req: NextRequest) => NextResponse;
} = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100,
}) {
  const {
    windowMs,
    maxRequests,
    keyGenerator = (req) => getClientIP(req),
    skipFor,
    onLimitReached
  } = options;

  return async function (req: NextRequest): Promise<NextResponse | null> {
    // Skip rate limiting if condition is met
    if (skipFor && skipFor(req)) {
      return null;
    }

    const cache = getCacheManager();
    const clientKey = keyGenerator(req);
    const windowKey = `rate_limit:${clientKey}:${Math.floor(Date.now() / windowMs)}`;

    try {
      const currentCount = await cache.increment(windowKey, 1, {
        ttl: Math.ceil(windowMs / 1000),
        namespace: 'rate_limit',
        tags: ['rate_limit'],
      });

      // Add rate limit headers
      const remainingRequests = Math.max(0, maxRequests - currentCount);
      const resetTime = Math.ceil((Math.floor(Date.now() / windowMs) + 1) * windowMs / 1000);

      const headers = {
        'X-RateLimit-Limit': maxRequests.toString(),
        'X-RateLimit-Remaining': remainingRequests.toString(),
        'X-RateLimit-Reset': resetTime.toString(),
        'X-RateLimit-Reset-After': Math.ceil(windowMs / 1000).toString(),
      };

      if (currentCount > maxRequests) {
        // Rate limit exceeded
        if (onLimitReached) {
          return onLimitReached(req);
        }

        return new NextResponse(
          JSON.stringify({
            error: 'Too Many Requests',
            message: `Rate limit exceeded. Try again in ${Math.ceil(windowMs / 1000)} seconds.`,
          }),
          {
            status: 429,
            headers: {
              ...headers,
              'Content-Type': 'application/json',
              'Retry-After': Math.ceil(windowMs / 1000).toString(),
            },
          }
        );
      }

      return null; // Continue to next middleware
    } catch (error) {
      console.error('Rate limit middleware error:', error);
      return null; // Allow request on error
    }
  };
}

/**
 * Cache Invalidation Middleware
 */
export function cacheInvalidationMiddleware(options: {
  invalidateOn?: string[]; // HTTP methods that should invalidate cache
  tagsToInvalidate?: string[] | ((req: NextRequest) => string[]);
  patternsToInvalidate?: string[] | ((req: NextRequest) => string[]);
} = {}) {
  const {
    invalidateOn = ['POST', 'PUT', 'DELETE', 'PATCH'],
    tagsToInvalidate = ['api', 'db'],
    patternsToInvalidate = []
  } = options;

  return async function (req: NextRequest, res: NextResponse) {
    if (invalidateOn.includes(req.method)) {
      const cache = getCacheManager();

      try {
        // Invalidate by tags
        let tags: string[] = [];
        if (typeof tagsToInvalidate === 'function') {
          tags = tagsToInvalidate(req);
        } else {
          tags = tagsToInvalidate;
        }

        if (tags.length > 0) {
          await cache.invalidateByTags(tags);
        }

        // Invalidate by patterns
        let patterns: string[] = [];
        if (typeof patternsToInvalidate === 'function') {
          patterns = patternsToInvalidate(req);
        } else {
          patterns = patternsToInvalidate;
        }

        for (const pattern of patterns) {
          await cache.deletePattern(pattern);
        }

        console.log(`🗑️  Cache invalidated for tags: ${tags.join(', ')}, patterns: ${patterns.join(', ')}`);
      } catch (error) {
        console.error('Cache invalidation error:', error);
      }
    }

    return res;
  };
}

/**
 * Cache warming job
 */
export async function warmCacheJob(): Promise<void> {
  const cache = getCacheManager();

  const warmupTasks = {
    // Example: warm up user settings
    'user_settings:default': async () => {
      // This would typically fetch from database
      return { theme: 'light', currency: 'USD' };
    },

    // Example: warm up payment methods
    'payment_methods:supported': async () => {
      return ['card', 'biometric', 'crypto'];
    },

    // Add more warmup tasks as needed
  };

  try {
    await cache.warmCache(warmupTasks, CacheStrategies.STATIC_DATA);
    console.log('✅ Cache warming completed successfully');
  } catch (error) {
    console.error('❌ Cache warming failed:', error);
  }
}

/**
 * Utility Functions
 */

function generateHttpCacheKey(req: NextRequest, varyBy: string[] = []): string {
  const url = req.url;
  const method = req.method;
  
  let keyParts = [method, url];

  // Add varying headers to cache key
  for (const header of varyBy) {
    const value = req.headers.get(header) || '';
    keyParts.push(`${header}:${value}`);
  }

  const keyString = keyParts.join('|');
  return createHash('sha256').update(keyString).digest('hex').substring(0, 32);
}

function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const realIP = req.headers.get('x-real-ip');
  const clientIP = req.headers.get('x-client-ip');

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  return realIP || clientIP || 'unknown';
}

/**
 * Cache health check endpoint data
 */
export async function getCacheHealthData() {
  const cache = getCacheManager();
  const stats = await cache.getStats();

  return {
    status: 'healthy',
    cache: {
      ...stats,
      strategies: Object.keys(CacheStrategies),
    },
    timestamp: new Date().toISOString(),
  };
}

export default {
  cacheMiddleware,
  withApiCache,
  withDbCache,
  rateLimitMiddleware,
  cacheInvalidationMiddleware,
  warmCacheJob,
  getCacheHealthData,
};