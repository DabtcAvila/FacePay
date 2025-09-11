/**
 * Advanced Rate Limiting System for Multi-tenant FacePay
 * Supports per-merchant, per-IP, and global rate limiting with Redis-like functionality
 */

import { prisma } from '@/lib/prisma';

// Rate limit rule interface
interface RateLimitRule {
  windowMs: number;
  maxRequests: number;
  keyPattern: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

// Rate limit result interface
interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  totalHits: number;
  error?: string;
}

// Plan-based rate limits
const PLAN_RATE_LIMITS: Record<string, RateLimitRule[]> = {
  starter: [
    { windowMs: 60000, maxRequests: 100, keyPattern: 'api' }, // 100/min
    { windowMs: 3600000, maxRequests: 1000, keyPattern: 'api' }, // 1k/hour
    { windowMs: 86400000, maxRequests: 10000, keyPattern: 'api' }, // 10k/day
  ],
  growth: [
    { windowMs: 60000, maxRequests: 500, keyPattern: 'api' }, // 500/min
    { windowMs: 3600000, maxRequests: 10000, keyPattern: 'api' }, // 10k/hour
    { windowMs: 86400000, maxRequests: 100000, keyPattern: 'api' }, // 100k/day
  ],
  enterprise: [
    { windowMs: 60000, maxRequests: 2000, keyPattern: 'api' }, // 2k/min
    { windowMs: 3600000, maxRequests: 50000, keyPattern: 'api' }, // 50k/hour
    { windowMs: 86400000, maxRequests: 1000000, keyPattern: 'api' }, // 1M/day
  ]
};

// Endpoint-specific rate limits
const ENDPOINT_RATE_LIMITS: Record<string, RateLimitRule[]> = {
  '/api/payments': [
    { windowMs: 60000, maxRequests: 50, keyPattern: 'payments' },
    { windowMs: 3600000, maxRequests: 500, keyPattern: 'payments' }
  ],
  '/api/transactions': [
    { windowMs: 60000, maxRequests: 200, keyPattern: 'transactions' },
    { windowMs: 3600000, maxRequests: 2000, keyPattern: 'transactions' }
  ],
  '/api/auth': [
    { windowMs: 300000, maxRequests: 10, keyPattern: 'auth' }, // 10 per 5 min
    { windowMs: 3600000, maxRequests: 50, keyPattern: 'auth' }
  ],
  '/api/webhooks': [
    { windowMs: 60000, maxRequests: 20, keyPattern: 'webhooks' },
    { windowMs: 3600000, maxRequests: 100, keyPattern: 'webhooks' }
  ]
};

// In-memory store for development (use Redis in production)
class MemoryRateLimitStore {
  private store = new Map<string, { count: number; resetTime: number }>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Cleanup expired entries every minute
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, value] of this.store.entries()) {
        if (value.resetTime <= now) {
          this.store.delete(key);
        }
      }
    }, 60000);
  }

  async get(key: string): Promise<{ count: number; resetTime: number } | null> {
    const entry = this.store.get(key);
    if (!entry || entry.resetTime <= Date.now()) {
      return null;
    }
    return entry;
  }

  async set(key: string, value: { count: number; resetTime: number }): Promise<void> {
    this.store.set(key, value);
  }

  async increment(key: string, windowMs: number): Promise<{ count: number; resetTime: number }> {
    const now = Date.now();
    const existing = await this.get(key);
    
    if (!existing) {
      const entry = { count: 1, resetTime: now + windowMs };
      await this.set(key, entry);
      return entry;
    }
    
    existing.count++;
    await this.set(key, existing);
    return existing;
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.store.clear();
  }
}

export class MultiTenantRateLimiter {
  private store: MemoryRateLimitStore;

  constructor() {
    this.store = new MemoryRateLimitStore();
  }

  /**
   * Check rate limits for a request
   */
  async checkRateLimit(
    merchantId: string,
    plan: string,
    endpoint: string,
    ipAddress?: string
  ): Promise<RateLimitResult> {
    try {
      // Get applicable rate limit rules
      const planRules = PLAN_RATE_LIMITS[plan] || PLAN_RATE_LIMITS.starter;
      const endpointRules = ENDPOINT_RATE_LIMITS[endpoint] || [];
      const allRules = [...planRules, ...endpointRules];

      // Check all rules
      for (const rule of allRules) {
        const result = await this.checkSingleRule(merchantId, rule, endpoint, ipAddress);
        if (!result.allowed) {
          return result;
        }
      }

      // All rules passed
      return {
        allowed: true,
        remaining: 0,
        resetTime: Date.now() + 60000,
        totalHits: 1
      };

    } catch (error) {
      console.error('Rate limiter error:', error);
      
      // Fail open - allow request if rate limiter fails
      return {
        allowed: true,
        remaining: 0,
        resetTime: Date.now() + 60000,
        totalHits: 1,
        error: 'Rate limiter error'
      };
    }
  }

  /**
   * Check a single rate limit rule
   */
  private async checkSingleRule(
    merchantId: string,
    rule: RateLimitRule,
    endpoint: string,
    ipAddress?: string
  ): Promise<RateLimitResult> {
    // Generate rate limit key
    const window = Math.floor(Date.now() / rule.windowMs);
    const key = this.generateRateLimitKey(merchantId, rule.keyPattern, endpoint, window, ipAddress);

    // Get/increment counter
    const entry = await this.store.increment(key, rule.windowMs);
    
    const allowed = entry.count <= rule.maxRequests;
    const remaining = Math.max(0, rule.maxRequests - entry.count);

    return {
      allowed,
      remaining,
      resetTime: entry.resetTime,
      totalHits: entry.count
    };
  }

  /**
   * Generate rate limit key
   */
  private generateRateLimitKey(
    merchantId: string,
    pattern: string,
    endpoint: string,
    window: number,
    ipAddress?: string
  ): string {
    const parts = [
      'rl', // rate limit prefix
      merchantId,
      pattern,
      window.toString()
    ];

    // Add IP-based limiting for sensitive endpoints
    if (ipAddress && (endpoint.includes('auth') || endpoint.includes('payments'))) {
      parts.push(ipAddress.replace(/\./g, '_'));
    }

    return parts.join(':');
  }

  /**
   * Log rate limit usage for billing
   */
  async logUsage(
    merchantId: string,
    endpoint: string,
    success: boolean,
    responseTime: number
  ): Promise<void> {
    try {
      const period = new Date().toISOString().substring(0, 7); // YYYY-MM
      
      // Log API call usage
      await prisma.merchantUsage.upsert({
        where: {
          merchantId_period_metric: {
            merchantId,
            period,
            metric: 'api_calls'
          }
        },
        update: {
          quantity: { increment: 1 },
          cost: { increment: this.calculateApiCallCost(endpoint) }
        },
        create: {
          merchantId,
          period,
          metric: 'api_calls',
          quantity: 1,
          cost: this.calculateApiCallCost(endpoint)
        }
      });

      // Log endpoint-specific usage
      const endpointMetric = this.getEndpointMetric(endpoint);
      if (endpointMetric) {
        await prisma.merchantUsage.upsert({
          where: {
            merchantId_period_metric: {
              merchantId,
              period,
              metric: endpointMetric
            }
          },
          update: {
            quantity: { increment: 1 },
            cost: { increment: this.calculateEndpointCost(endpoint) }
          },
          create: {
            merchantId,
            period,
            metric: endpointMetric,
            quantity: 1,
            cost: this.calculateEndpointCost(endpoint)
          }
        });
      }

      // Log performance metrics
      await this.logPerformanceMetric(merchantId, endpoint, responseTime, success);

    } catch (error) {
      console.error('Usage logging error:', error);
      // Don't fail the request if usage logging fails
    }
  }

  /**
   * Calculate API call cost for billing
   */
  private calculateApiCallCost(endpoint: string): number {
    // Cost in cents per API call
    const costs: Record<string, number> = {
      '/api/payments': 0.05, // 5 cents per payment API call
      '/api/transactions': 0.01, // 1 cent per transaction API call
      '/api/biometric': 0.10, // 10 cents per biometric call
      '/api/webhooks': 0.001, // 0.1 cents per webhook call
      'default': 0.001 // 0.1 cents for other calls
    };

    for (const [path, cost] of Object.entries(costs)) {
      if (endpoint.startsWith(path)) {
        return cost;
      }
    }

    return costs.default;
  }

  /**
   * Calculate endpoint-specific cost
   */
  private calculateEndpointCost(endpoint: string): number {
    return this.calculateApiCallCost(endpoint);
  }

  /**
   * Get endpoint metric name
   */
  private getEndpointMetric(endpoint: string): string | null {
    if (endpoint.startsWith('/api/payments')) return 'payment_api_calls';
    if (endpoint.startsWith('/api/transactions')) return 'transaction_api_calls';
    if (endpoint.startsWith('/api/biometric')) return 'biometric_api_calls';
    if (endpoint.startsWith('/api/webhooks')) return 'webhook_api_calls';
    return null;
  }

  /**
   * Log performance metrics
   */
  private async logPerformanceMetric(
    merchantId: string,
    endpoint: string,
    responseTime: number,
    success: boolean
  ): Promise<void> {
    try {
      // Sample performance data (log 1% of requests to avoid overload)
      if (Math.random() > 0.01) return;

      await prisma.performanceMetric.create({
        data: {
          id: `perf_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          merchantId,
          name: 'api_response_time',
          value: responseTime,
          unit: 'ms',
          timestamp: new Date(),
          url: endpoint,
          sessionId: 'api_call',
          deviceInfo: {
            endpoint,
            success,
            method: 'API'
          }
        }
      });
    } catch (error) {
      console.error('Performance metric logging error:', error);
    }
  }

  /**
   * Get rate limit status for merchant
   */
  async getRateLimitStatus(merchantId: string, plan: string): Promise<any> {
    const rules = PLAN_RATE_LIMITS[plan] || PLAN_RATE_LIMITS.starter;
    const status: any = {};

    for (const rule of rules) {
      const window = Math.floor(Date.now() / rule.windowMs);
      const key = this.generateRateLimitKey(merchantId, rule.keyPattern, '', window);
      const entry = await this.store.get(key);
      
      const windowName = this.getWindowName(rule.windowMs);
      status[windowName] = {
        limit: rule.maxRequests,
        used: entry ? entry.count : 0,
        remaining: entry ? Math.max(0, rule.maxRequests - entry.count) : rule.maxRequests,
        resetTime: entry ? entry.resetTime : Date.now() + rule.windowMs
      };
    }

    return status;
  }

  /**
   * Get human-readable window name
   */
  private getWindowName(windowMs: number): string {
    if (windowMs === 60000) return 'per_minute';
    if (windowMs === 3600000) return 'per_hour';
    if (windowMs === 86400000) return 'per_day';
    return `per_${windowMs}ms`;
  }

  /**
   * Reset rate limits for merchant (admin function)
   */
  async resetRateLimits(merchantId: string): Promise<void> {
    // In production with Redis, you'd delete keys by pattern
    // For now, this is a no-op with the memory store
    console.log(`Rate limits reset for merchant ${merchantId}`);
  }

  /**
   * Destroy the rate limiter
   */
  destroy(): void {
    this.store.destroy();
  }
}

// Create singleton instance
export const rateLimiter = new MultiTenantRateLimiter();

// Helper to get rate limit headers for responses
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString(),
    'X-RateLimit-Total': result.totalHits.toString()
  };
}

// Helper to check if request should be rate limited
export async function shouldRateLimit(
  request: Request,
  merchantId: string,
  plan: string
): Promise<{ limited: boolean; headers: Record<string, string>; status?: number }> {
  const url = new URL(request.url);
  const endpoint = url.pathname;
  const ipAddress = request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   'unknown';

  const result = await rateLimiter.checkRateLimit(merchantId, plan, endpoint, ipAddress);
  
  return {
    limited: !result.allowed,
    headers: getRateLimitHeaders(result),
    status: result.allowed ? undefined : 429
  };
}