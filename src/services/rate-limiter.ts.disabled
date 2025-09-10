import { getRedisClient, REDIS_KEYS } from '@/lib/redis';
import { getCacheManager } from '@/lib/cache';
import { Redis, Cluster } from 'ioredis';

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  message?: string; // Custom error message
  statusCode?: number; // HTTP status code for rate limit exceeded
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
  keyPrefix?: string; // Custom key prefix
}

export interface RateLimitResult {
  allowed: boolean;
  remainingRequests: number;
  resetTime: number;
  totalRequests: number;
  windowStart: number;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
}

/**
 * Redis-based rate limiter for FacePay
 */
export class RateLimiter {
  private redis: Redis | Cluster;
  private cache: ReturnType<typeof getCacheManager>;
  private defaultConfig: RateLimitConfig;

  constructor(defaultConfig: Partial<RateLimitConfig> = {}) {
    this.redis = getRedisClient();
    this.cache = getCacheManager();
    this.defaultConfig = {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100,
      message: 'Too many requests, please try again later',
      statusCode: 429,
      keyPrefix: 'rate_limit',
      ...defaultConfig,
    };
  }

  /**
   * Check rate limit for a key
   */
  async checkLimit(
    key: string,
    config: Partial<RateLimitConfig> = {}
  ): Promise<RateLimitResult> {
    const finalConfig = { ...this.defaultConfig, ...config };
    const { windowMs, maxRequests, keyPrefix } = finalConfig;

    const now = Date.now();
    const windowStart = Math.floor(now / windowMs) * windowMs;
    const windowKey = `${keyPrefix}:${key}:${windowStart}`;

    try {
      // Use Lua script for atomic operations
      const luaScript = `
        local key = KEYS[1]
        local window_start = ARGV[1]
        local window_ms = ARGV[2]
        local max_requests = ARGV[3]
        local now = ARGV[4]
        
        local current = redis.call('GET', key)
        if current == false then
          current = 0
        else
          current = tonumber(current)
        end
        
        local ttl = redis.call('TTL', key)
        if ttl == -1 then
          redis.call('EXPIRE', key, math.ceil(window_ms / 1000))
        end
        
        local remaining = max_requests - current
        local reset_time = window_start + window_ms
        
        return {current, remaining, reset_time, window_start}
      `;

      const result = await this.redis.eval(
        luaScript,
        1,
        windowKey,
        windowStart.toString(),
        windowMs.toString(),
        maxRequests.toString(),
        now.toString()
      ) as number[];

      const [totalRequests, remainingRequests, resetTime, windowStartTime] = result;

      return {
        allowed: totalRequests < maxRequests,
        remainingRequests: Math.max(0, remainingRequests),
        resetTime,
        totalRequests,
        windowStart: windowStartTime,
      };
    } catch (error) {
      console.error('Rate limit check error:', error);
      // Fail open - allow request on error
      return {
        allowed: true,
        remainingRequests: maxRequests,
        resetTime: now + windowMs,
        totalRequests: 0,
        windowStart,
      };
    }
  }

  /**
   * Increment rate limit counter
   */
  async increment(
    key: string,
    config: Partial<RateLimitConfig> = {}
  ): Promise<RateLimitResult> {
    const finalConfig = { ...this.defaultConfig, ...config };
    const { windowMs, maxRequests, keyPrefix } = finalConfig;

    const now = Date.now();
    const windowStart = Math.floor(now / windowMs) * windowMs;
    const windowKey = `${keyPrefix}:${key}:${windowStart}`;

    try {
      // Use Lua script for atomic increment and check
      const luaScript = `
        local key = KEYS[1]
        local window_start = ARGV[1]
        local window_ms = ARGV[2]
        local max_requests = ARGV[3]
        local now = ARGV[4]
        
        local current = redis.call('INCR', key)
        local ttl = redis.call('TTL', key)
        
        if ttl == -1 then
          redis.call('EXPIRE', key, math.ceil(window_ms / 1000))
        end
        
        local remaining = max_requests - current
        local reset_time = window_start + window_ms
        
        return {current, remaining, reset_time, window_start}
      `;

      const result = await this.redis.eval(
        luaScript,
        1,
        windowKey,
        windowStart.toString(),
        windowMs.toString(),
        maxRequests.toString(),
        now.toString()
      ) as number[];

      const [totalRequests, remainingRequests, resetTime, windowStartTime] = result;

      return {
        allowed: totalRequests <= maxRequests,
        remainingRequests: Math.max(0, remainingRequests),
        resetTime,
        totalRequests,
        windowStart: windowStartTime,
      };
    } catch (error) {
      console.error('Rate limit increment error:', error);
      // Fail open - allow request on error
      return {
        allowed: true,
        remainingRequests: maxRequests,
        resetTime: now + windowMs,
        totalRequests: 0,
        windowStart,
      };
    }
  }

  /**
   * Reset rate limit for a key
   */
  async reset(key: string, keyPrefix: string = this.defaultConfig.keyPrefix!): Promise<boolean> {
    try {
      const pattern = `${keyPrefix}:${key}:*`;
      const keys = await this.redis.keys(pattern);
      
      if (keys.length > 0) {
        await this.redis.del(...keys);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Rate limit reset error:', error);
      return false;
    }
  }

  /**
   * Get rate limit info for a key
   */
  async getInfo(
    key: string,
    config: Partial<RateLimitConfig> = {}
  ): Promise<RateLimitInfo> {
    const result = await this.checkLimit(key, config);
    const finalConfig = { ...this.defaultConfig, ...config };

    return {
      limit: finalConfig.maxRequests,
      remaining: result.remainingRequests,
      reset: Math.ceil(result.resetTime / 1000),
      retryAfter: result.allowed ? undefined : Math.ceil((result.resetTime - Date.now()) / 1000),
    };
  }

  /**
   * Sliding window rate limiter (more accurate but resource intensive)
   */
  async slidingWindowLimit(
    key: string,
    config: Partial<RateLimitConfig> = {}
  ): Promise<RateLimitResult> {
    const finalConfig = { ...this.defaultConfig, ...config };
    const { windowMs, maxRequests, keyPrefix } = finalConfig;

    const now = Date.now();
    const windowStart = now - windowMs;
    const slidingWindowKey = `${keyPrefix}:sliding:${key}`;

    try {
      // Use sorted set to store request timestamps
      const luaScript = `
        local key = KEYS[1]
        local window_start = ARGV[1]
        local max_requests = ARGV[2]
        local now = ARGV[3]
        local window_ms = ARGV[4]
        
        -- Remove expired entries
        redis.call('ZREMRANGEBYSCORE', key, '-inf', window_start)
        
        -- Count current requests in window
        local current = redis.call('ZCARD', key)
        
        -- Check if we can add this request
        if current < max_requests then
          -- Add current request
          redis.call('ZADD', key, now, now)
          redis.call('EXPIRE', key, math.ceil(window_ms / 1000))
          current = current + 1
        end
        
        local remaining = max_requests - current
        local reset_time = now + window_ms
        
        return {current, remaining, reset_time, window_start}
      `;

      const result = await this.redis.eval(
        luaScript,
        1,
        slidingWindowKey,
        windowStart.toString(),
        maxRequests.toString(),
        now.toString(),
        windowMs.toString()
      ) as number[];

      const [totalRequests, remainingRequests, resetTime, windowStartTime] = result;

      return {
        allowed: totalRequests <= maxRequests,
        remainingRequests: Math.max(0, remainingRequests),
        resetTime,
        totalRequests,
        windowStart: windowStartTime,
      };
    } catch (error) {
      console.error('Sliding window rate limit error:', error);
      return {
        allowed: true,
        remainingRequests: maxRequests,
        resetTime: now + windowMs,
        totalRequests: 0,
        windowStart,
      };
    }
  }

  /**
   * Token bucket rate limiter
   */
  async tokenBucketLimit(
    key: string,
    config: {
      bucketSize: number;
      refillRate: number; // tokens per second
      tokensRequested?: number;
      keyPrefix?: string;
    }
  ): Promise<{ allowed: boolean; tokensRemaining: number; refillTime: number }> {
    const {
      bucketSize,
      refillRate,
      tokensRequested = 1,
      keyPrefix = 'token_bucket',
    } = config;

    const now = Date.now();
    const bucketKey = `${keyPrefix}:${key}`;

    try {
      const luaScript = `
        local key = KEYS[1]
        local bucket_size = tonumber(ARGV[1])
        local refill_rate = tonumber(ARGV[2])
        local tokens_requested = tonumber(ARGV[3])
        local now = tonumber(ARGV[4])
        
        local bucket_data = redis.call('HMGET', key, 'tokens', 'last_refill')
        local tokens = tonumber(bucket_data[1]) or bucket_size
        local last_refill = tonumber(bucket_data[2]) or now
        
        -- Calculate tokens to add based on time elapsed
        local time_elapsed = (now - last_refill) / 1000
        local tokens_to_add = math.floor(time_elapsed * refill_rate)
        
        -- Refill bucket (don't exceed bucket size)
        tokens = math.min(bucket_size, tokens + tokens_to_add)
        
        local allowed = tokens >= tokens_requested
        if allowed then
          tokens = tokens - tokens_requested
        end
        
        -- Update bucket state
        redis.call('HMSET', key, 'tokens', tokens, 'last_refill', now)
        redis.call('EXPIRE', key, bucket_size * 2) -- TTL based on bucket size
        
        local refill_time = 0
        if not allowed then
          refill_time = now + ((tokens_requested - tokens) / refill_rate * 1000)
        end
        
        return {allowed and 1 or 0, tokens, refill_time}
      `;

      const result = await this.redis.eval(
        luaScript,
        1,
        bucketKey,
        bucketSize.toString(),
        refillRate.toString(),
        tokensRequested.toString(),
        now.toString()
      ) as number[];

      const [allowedNum, tokensRemaining, refillTime] = result;

      return {
        allowed: allowedNum === 1,
        tokensRemaining,
        refillTime,
      };
    } catch (error) {
      console.error('Token bucket rate limit error:', error);
      return {
        allowed: true,
        tokensRemaining: bucketSize,
        refillTime: 0,
      };
    }
  }

  /**
   * Get rate limit statistics
   */
  async getStats(keyPrefix: string = this.defaultConfig.keyPrefix!): Promise<{
    totalKeys: number;
    activeWindows: number;
    topKeys: Array<{ key: string; requests: number }>;
  }> {
    try {
      const pattern = `${keyPrefix}:*`;
      const keys = await this.redis.keys(pattern);
      const activeWindows = keys.length;

      // Get request counts for top keys
      const keyRequests = await Promise.all(
        keys.slice(0, 10).map(async (key) => {
          const requests = await this.redis.get(key) || '0';
          return {
            key: key.replace(`${keyPrefix}:`, ''),
            requests: parseInt(requests, 10),
          };
        })
      );

      const topKeys = keyRequests
        .sort((a, b) => b.requests - a.requests)
        .slice(0, 5);

      return {
        totalKeys: keys.length,
        activeWindows,
        topKeys,
      };
    } catch (error) {
      console.error('Rate limit stats error:', error);
      return {
        totalKeys: 0,
        activeWindows: 0,
        topKeys: [],
      };
    }
  }
}

// Singleton instance
let rateLimiter: RateLimiter | null = null;

/**
 * Get the global rate limiter instance
 */
export function getRateLimiter(): RateLimiter {
  if (!rateLimiter) {
    rateLimiter = new RateLimiter();
  }
  return rateLimiter;
}

/**
 * Predefined rate limit configurations
 */
export const RateLimitConfigs = {
  // General API rate limiting
  API_DEFAULT: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
  },

  // Authentication endpoints (stricter)
  AUTH: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    message: 'Too many authentication attempts',
  },

  // Payment endpoints (very strict)
  PAYMENT: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10,
    message: 'Too many payment attempts',
  },

  // Biometric verification (strict)
  BIOMETRIC: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 3,
    message: 'Too many biometric verification attempts',
  },

  // File upload
  UPLOAD: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 20,
    message: 'Upload limit exceeded',
  },

  // WebAuthn operations
  WEBAUTHN: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10,
    message: 'Too many WebAuthn attempts',
  },

  // Password reset
  PASSWORD_RESET: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3,
    message: 'Too many password reset attempts',
  },
} as const;

/**
 * Utility functions
 */

/**
 * Generate rate limit key based on IP and optional user ID
 */
export function generateRateLimitKey(
  ip: string,
  userId?: string,
  endpoint?: string
): string {
  const parts = [ip];
  if (userId) parts.push(`user:${userId}`);
  if (endpoint) parts.push(`endpoint:${endpoint}`);
  return parts.join(':');
}

/**
 * Extract IP address from request headers
 */
export function getClientIP(req: any): string {
  const forwarded = req.headers?.['x-forwarded-for'];
  const realIP = req.headers?.['x-real-ip'];
  const clientIP = req.headers?.['x-client-ip'];

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  return realIP || clientIP || req.connection?.remoteAddress || 'unknown';
}

export default {
  RateLimiter,
  getRateLimiter,
  RateLimitConfigs,
  generateRateLimitKey,
  getClientIP,
};