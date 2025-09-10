import { getRedisClient, REDIS_KEYS } from '@/lib/redis';
import { Redis, Cluster } from 'ioredis';
import { randomUUID } from 'crypto';

export interface LockOptions {
  ttl?: number; // Time to live in milliseconds
  retryAttempts?: number; // Number of retry attempts
  retryDelay?: number; // Delay between retries in milliseconds
  identifier?: string; // Custom lock identifier
}

export interface LockResult {
  acquired: boolean;
  identifier: string;
  expiresAt: number;
}

export interface LockInfo {
  resource: string;
  identifier: string;
  acquiredAt: number;
  expiresAt: number;
  ttl: number;
}

/**
 * Redis-based Distributed Lock Manager for FacePay
 */
export class DistributedLockManager {
  private redis: Redis | Cluster;
  private defaultTTL: number;
  private defaultRetryAttempts: number;
  private defaultRetryDelay: number;

  constructor(options: {
    defaultTTL?: number;
    defaultRetryAttempts?: number;
    defaultRetryDelay?: number;
  } = {}) {
    this.redis = getRedisClient();
    this.defaultTTL = options.defaultTTL || 30000; // 30 seconds default
    this.defaultRetryAttempts = options.defaultRetryAttempts || 3;
    this.defaultRetryDelay = options.defaultRetryDelay || 100; // 100ms
  }

  /**
   * Acquire a distributed lock
   */
  async acquireLock(
    resource: string,
    options: LockOptions = {}
  ): Promise<LockResult> {
    const {
      ttl = this.defaultTTL,
      retryAttempts = this.defaultRetryAttempts,
      retryDelay = this.defaultRetryDelay,
      identifier = randomUUID(),
    } = options;

    const lockKey = REDIS_KEYS.LOCK(resource);
    const expiresAt = Date.now() + ttl;

    for (let attempt = 0; attempt <= retryAttempts; attempt++) {
      try {
        // Use Lua script for atomic SET NX EX operation
        const luaScript = `
          local key = KEYS[1]
          local identifier = ARGV[1]
          local ttl_seconds = ARGV[2]
          local current_time = ARGV[3]
          
          -- Try to set the lock if it doesn't exist
          local result = redis.call('SET', key, identifier, 'PX', ttl_seconds, 'NX')
          
          if result then
            return {1, identifier, tonumber(current_time) + tonumber(ttl_seconds)}
          else
            -- Check if the existing lock has expired
            local existing_value = redis.call('GET', key)
            local ttl = redis.call('PTTL', key)
            
            if ttl == -1 then
              -- Key exists but has no expiry, force delete and retry
              redis.call('DEL', key)
              local retry_result = redis.call('SET', key, identifier, 'PX', ttl_seconds, 'NX')
              if retry_result then
                return {1, identifier, tonumber(current_time) + tonumber(ttl_seconds)}
              end
            end
            
            return {0, existing_value or '', ttl}
          end
        `;

        const result = await this.redis.eval(
          luaScript,
          1,
          lockKey,
          identifier,
          ttl.toString(),
          Date.now().toString()
        ) as [number, string, number];

        const [acquired, lockIdentifier, expiration] = result;

        if (acquired === 1) {
          console.log(`🔒 Lock acquired for resource: ${resource} (${identifier})`);
          return {
            acquired: true,
            identifier: lockIdentifier,
            expiresAt: expiration,
          };
        }

        // Wait before retrying
        if (attempt < retryAttempts) {
          await this.sleep(retryDelay);
        }
      } catch (error) {
        console.error(`Lock acquisition error (attempt ${attempt + 1}):`, error);
        if (attempt === retryAttempts) {
          return {
            acquired: false,
            identifier,
            expiresAt: 0,
          };
        }
      }
    }

    console.log(`❌ Failed to acquire lock for resource: ${resource}`);
    return {
      acquired: false,
      identifier,
      expiresAt: 0,
    };
  }

  /**
   * Release a distributed lock
   */
  async releaseLock(resource: string, identifier: string): Promise<boolean> {
    const lockKey = REDIS_KEYS.LOCK(resource);

    try {
      // Use Lua script to ensure we only release our own lock
      const luaScript = `
        local key = KEYS[1]
        local identifier = ARGV[1]
        
        local current_value = redis.call('GET', key)
        if current_value == identifier then
          redis.call('DEL', key)
          return 1
        else
          return 0
        end
      `;

      const result = await this.redis.eval(
        luaScript,
        1,
        lockKey,
        identifier
      ) as number;

      const released = result === 1;
      
      if (released) {
        console.log(`🔓 Lock released for resource: ${resource} (${identifier})`);
      } else {
        console.log(`⚠️  Failed to release lock for resource: ${resource} - not owned or expired`);
      }

      return released;
    } catch (error) {
      console.error('Lock release error:', error);
      return false;
    }
  }

  /**
   * Extend lock expiration
   */
  async extendLock(
    resource: string,
    identifier: string,
    additionalTTL: number
  ): Promise<boolean> {
    const lockKey = REDIS_KEYS.LOCK(resource);

    try {
      const luaScript = `
        local key = KEYS[1]
        local identifier = ARGV[1]
        local additional_ttl = ARGV[2]
        
        local current_value = redis.call('GET', key)
        if current_value == identifier then
          local current_ttl = redis.call('PTTL', key)
          if current_ttl > 0 then
            redis.call('PEXPIRE', key, current_ttl + additional_ttl)
            return current_ttl + additional_ttl
          end
        end
        return 0
      `;

      const result = await this.redis.eval(
        luaScript,
        1,
        lockKey,
        identifier,
        additionalTTL.toString()
      ) as number;

      const extended = result > 0;
      
      if (extended) {
        console.log(`⏱️  Lock extended for resource: ${resource} (${identifier})`);
      }

      return extended;
    } catch (error) {
      console.error('Lock extension error:', error);
      return false;
    }
  }

  /**
   * Check if a lock exists and get its info
   */
  async getLockInfo(resource: string): Promise<LockInfo | null> {
    const lockKey = REDIS_KEYS.LOCK(resource);

    try {
      const luaScript = `
        local key = KEYS[1]
        
        local value = redis.call('GET', key)
        if value then
          local ttl = redis.call('PTTL', key)
          return {value, ttl}
        else
          return nil
        end
      `;

      const result = await this.redis.eval(luaScript, 1, lockKey) as [string, number] | null;

      if (!result) {
        return null;
      }

      const [identifier, ttl] = result;
      const now = Date.now();

      return {
        resource,
        identifier,
        acquiredAt: now - (this.defaultTTL - ttl), // Approximate
        expiresAt: now + ttl,
        ttl,
      };
    } catch (error) {
      console.error('Get lock info error:', error);
      return null;
    }
  }

  /**
   * Force release a lock (use with caution)
   */
  async forceReleaseLock(resource: string): Promise<boolean> {
    const lockKey = REDIS_KEYS.LOCK(resource);

    try {
      const result = await this.redis.del(lockKey);
      const released = result > 0;
      
      if (released) {
        console.log(`🚨 Lock force-released for resource: ${resource}`);
      }

      return released;
    } catch (error) {
      console.error('Force release lock error:', error);
      return false;
    }
  }

  /**
   * Execute a function with automatic lock management
   */
  async withLock<T>(
    resource: string,
    executor: () => Promise<T>,
    options: LockOptions = {}
  ): Promise<T> {
    const lockResult = await this.acquireLock(resource, options);
    
    if (!lockResult.acquired) {
      throw new Error(`Failed to acquire lock for resource: ${resource}`);
    }

    try {
      return await executor();
    } finally {
      await this.releaseLock(resource, lockResult.identifier);
    }
  }

  /**
   * Execute a function with automatic lock management and retries
   */
  async withLockRetry<T>(
    resource: string,
    executor: () => Promise<T>,
    options: LockOptions & { executorRetries?: number } = {}
  ): Promise<T> {
    const { executorRetries = 1, ...lockOptions } = options;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= executorRetries; attempt++) {
      try {
        return await this.withLock(resource, executor, lockOptions);
      } catch (error) {
        lastError = error as Error;
        console.log(`Attempt ${attempt + 1} failed for resource ${resource}:`, error);
        
        if (attempt < executorRetries) {
          await this.sleep(lockOptions.retryDelay || this.defaultRetryDelay);
        }
      }
    }

    throw lastError || new Error(`Failed to execute with lock after ${executorRetries + 1} attempts`);
  }

  /**
   * Get all active locks (for monitoring)
   */
  async getActiveLocks(): Promise<LockInfo[]> {
    try {
      const pattern = REDIS_KEYS.LOCK('*');
      const keys = await this.redis.keys(pattern);
      const locks: LockInfo[] = [];

      for (const key of keys) {
        const resource = key.replace(/^.*:lock:/, '');
        const lockInfo = await this.getLockInfo(resource);
        if (lockInfo) {
          locks.push(lockInfo);
        }
      }

      return locks.sort((a, b) => b.expiresAt - a.expiresAt);
    } catch (error) {
      console.error('Get active locks error:', error);
      return [];
    }
  }

  /**
   * Clean up expired locks (maintenance task)
   */
  async cleanupExpiredLocks(): Promise<number> {
    try {
      const pattern = REDIS_KEYS.LOCK('*');
      const keys = await this.redis.keys(pattern);
      let cleanedCount = 0;

      for (const key of keys) {
        const ttl = await this.redis.pttl(key);
        if (ttl === -1 || ttl === -2) { // No TTL or key doesn't exist
          await this.redis.del(key);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        console.log(`🧹 Cleaned up ${cleanedCount} expired locks`);
      }

      return cleanedCount;
    } catch (error) {
      console.error('Lock cleanup error:', error);
      return 0;
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
let distributedLockManager: DistributedLockManager | null = null;

/**
 * Get the global distributed lock manager instance
 */
export function getDistributedLockManager(): DistributedLockManager {
  if (!distributedLockManager) {
    distributedLockManager = new DistributedLockManager();
  }
  return distributedLockManager;
}

/**
 * Decorator for automatic locking
 */
export function withDistributedLock(
  resourceKey: string | ((args: any[]) => string),
  options: LockOptions = {}
) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const lockManager = getDistributedLockManager();
      const resource = typeof resourceKey === 'function' 
        ? resourceKey(args) 
        : resourceKey;

      return lockManager.withLock(
        resource,
        () => originalMethod.apply(this, args),
        options
      );
    };

    return descriptor;
  };
}

/**
 * Common lock resources for FacePay
 */
export const LockResources = {
  // Payment processing locks
  PAYMENT_PROCESSING: (paymentId: string) => `payment:processing:${paymentId}`,
  PAYMENT_REFUND: (paymentId: string) => `payment:refund:${paymentId}`,
  
  // User account locks
  USER_UPDATE: (userId: string) => `user:update:${userId}`,
  USER_BALANCE: (userId: string) => `user:balance:${userId}`,
  
  // Biometric processing locks
  BIOMETRIC_VERIFICATION: (sessionId: string) => `biometric:verify:${sessionId}`,
  FACE_ENROLLMENT: (userId: string) => `face:enroll:${userId}`,
  
  // WebAuthn locks
  WEBAUTHN_REGISTRATION: (userId: string) => `webauthn:register:${userId}`,
  WEBAUTHN_AUTHENTICATION: (challengeId: string) => `webauthn:auth:${challengeId}`,
  
  // Session locks
  SESSION_UPDATE: (sessionId: string) => `session:update:${sessionId}`,
  
  // Cache locks
  CACHE_WARMUP: 'cache:warmup',
  CACHE_CLEANUP: 'cache:cleanup',
  
  // System locks
  DATABASE_MIGRATION: 'system:db:migration',
  SYSTEM_MAINTENANCE: 'system:maintenance',
} as const;

/**
 * Lock configurations for different operations
 */
export const LockConfigs = {
  // Quick operations
  QUICK: {
    ttl: 5000, // 5 seconds
    retryAttempts: 3,
    retryDelay: 100,
  },

  // Standard operations
  STANDARD: {
    ttl: 30000, // 30 seconds
    retryAttempts: 3,
    retryDelay: 200,
  },

  // Payment operations (longer due to external APIs)
  PAYMENT: {
    ttl: 60000, // 1 minute
    retryAttempts: 2,
    retryDelay: 500,
  },

  // Biometric operations (longer processing time)
  BIOMETRIC: {
    ttl: 45000, // 45 seconds
    retryAttempts: 1,
    retryDelay: 1000,
  },

  // System maintenance
  MAINTENANCE: {
    ttl: 300000, // 5 minutes
    retryAttempts: 1,
    retryDelay: 1000,
  },
} as const;

/**
 * Scheduled job to clean up expired locks
 */
export async function lockCleanupJob(): Promise<void> {
  try {
    const lockManager = getDistributedLockManager();
    const cleaned = await lockManager.cleanupExpiredLocks();
    console.log(`🧹 Lock cleanup job completed: ${cleaned} locks cleaned`);
  } catch (error) {
    console.error('❌ Lock cleanup job failed:', error);
  }
}

export default {
  DistributedLockManager,
  getDistributedLockManager,
  withDistributedLock,
  LockResources,
  LockConfigs,
  lockCleanupJob,
};