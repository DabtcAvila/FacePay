/**
 * Multi-tenant middleware for FacePay
 * Provides merchant isolation and API key validation
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

// Merchant context interface
export interface MerchantContext {
  id: string;
  publicKey: string;
  secretKey: string;
  testMode: boolean;
  status: string;
  kycStatus: string;
  plan: string;
  settings: any;
}

// Rate limiting interface
interface RateLimitRule {
  windowMs: number;
  maxRequests: number;
  keyPattern: string;
}

// Rate limiting rules by plan
const RATE_LIMITS: Record<string, RateLimitRule[]> = {
  starter: [
    { windowMs: 60000, maxRequests: 100, keyPattern: 'api' }, // 100 per minute
    { windowMs: 3600000, maxRequests: 1000, keyPattern: 'api' }, // 1000 per hour
  ],
  growth: [
    { windowMs: 60000, maxRequests: 500, keyPattern: 'api' }, // 500 per minute
    { windowMs: 3600000, maxRequests: 10000, keyPattern: 'api' }, // 10k per hour
  ],
  enterprise: [
    { windowMs: 60000, maxRequests: 2000, keyPattern: 'api' }, // 2k per minute
    { windowMs: 3600000, maxRequests: 100000, keyPattern: 'api' }, // 100k per hour
  ]
};

// Cache for merchant data (in production, use Redis)
const merchantCache = new Map<string, { merchant: MerchantContext; timestamp: number }>();
const CACHE_TTL = 300000; // 5 minutes

export class MultitenantMiddleware {
  private rateLimitStore: Map<string, { count: number; resetTime: number }> = new Map();

  /**
   * Extract and validate API key from request
   */
  private extractApiKey(request: NextRequest): { key: string; type: 'public' | 'secret' } | null {
    // Check Authorization header (Bearer token)
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const key = authHeader.substring(7);
      if (key.startsWith('pk_')) return { key, type: 'public' };
      if (key.startsWith('sk_')) return { key, type: 'secret' };
    }

    // Check X-API-Key header
    const apiKeyHeader = request.headers.get('x-api-key');
    if (apiKeyHeader) {
      if (apiKeyHeader.startsWith('pk_')) return { key: apiKeyHeader, type: 'public' };
      if (apiKeyHeader.startsWith('sk_')) return { key: apiKeyHeader, type: 'secret' };
    }

    // Check query parameter (less secure, only for public keys)
    const url = new URL(request.url);
    const keyParam = url.searchParams.get('key');
    if (keyParam?.startsWith('pk_')) {
      return { key: keyParam, type: 'public' };
    }

    return null;
  }

  /**
   * Hash API key for database lookup
   */
  private hashApiKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
  }

  /**
   * Get merchant from cache or database
   */
  private async getMerchant(key: string, keyType: 'public' | 'secret'): Promise<MerchantContext | null> {
    const cacheKey = `${keyType}:${key}`;
    const cached = merchantCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.merchant;
    }

    try {
      const merchant = await prisma.merchant.findFirst({
        where: {
          [keyType === 'public' ? 'publicKey' : 'secretKey']: key,
          isActive: true,
          status: 'active'
        },
        select: {
          id: true,
          publicKey: true,
          secretKey: true,
          testMode: true,
          status: true,
          kycStatus: true,
          plan: true,
          settings: true
        }
      });

      if (!merchant) return null;

      const merchantContext: MerchantContext = {
        id: merchant.id,
        publicKey: merchant.publicKey,
        secretKey: merchant.secretKey,
        testMode: merchant.testMode,
        status: merchant.status,
        kycStatus: merchant.kycStatus,
        plan: merchant.plan,
        settings: merchant.settings
      };

      // Cache the result
      merchantCache.set(cacheKey, {
        merchant: merchantContext,
        timestamp: Date.now()
      });

      return merchantContext;
    } catch (error) {
      console.error('Error fetching merchant:', error);
      return null;
    }
  }

  /**
   * Check rate limits for merchant
   */
  private checkRateLimit(merchantId: string, plan: string): boolean {
    const rules = RATE_LIMITS[plan] || RATE_LIMITS.starter;
    const now = Date.now();

    for (const rule of rules) {
      const key = `${merchantId}:${rule.keyPattern}:${Math.floor(now / rule.windowMs)}`;
      const current = this.rateLimitStore.get(key);

      if (!current) {
        this.rateLimitStore.set(key, { count: 1, resetTime: now + rule.windowMs });
        continue;
      }

      if (current.count >= rule.maxRequests) {
        return false; // Rate limit exceeded
      }

      current.count++;
    }

    return true;
  }

  /**
   * Log API usage for billing
   */
  private async logUsage(merchantId: string, endpoint: string) {
    try {
      const period = new Date().toISOString().substring(0, 7); // YYYY-MM format
      
      await prisma.merchantUsage.upsert({
        where: {
          merchantId_period_metric: {
            merchantId,
            period,
            metric: 'api_calls'
          }
        },
        update: {
          quantity: { increment: 1 }
        },
        create: {
          merchantId,
          period,
          metric: 'api_calls',
          quantity: 1
        }
      });
    } catch (error) {
      console.error('Error logging usage:', error);
      // Don't fail the request if usage logging fails
    }
  }

  /**
   * Validate merchant permissions for endpoint
   */
  private validatePermissions(merchant: MerchantContext, request: NextRequest): boolean {
    const pathname = new URL(request.url).pathname;
    
    // KYC required endpoints
    const kycRequiredPaths = ['/api/payments', '/api/transactions'];
    if (kycRequiredPaths.some(path => pathname.startsWith(path))) {
      if (merchant.kycStatus !== 'verified') {
        return false;
      }
    }

    // Test mode restrictions
    if (merchant.testMode && pathname.includes('/live/')) {
      return false;
    }

    return true;
  }

  /**
   * Main middleware function
   */
  async handle(request: NextRequest): Promise<NextResponse | null> {
    const pathname = new URL(request.url).pathname;
    
    // Skip middleware for non-API routes
    if (!pathname.startsWith('/api/')) {
      return null;
    }

    // Skip middleware for public endpoints
    const publicEndpoints = ['/api/health', '/api/version', '/api/docs'];
    if (publicEndpoints.some(endpoint => pathname.startsWith(endpoint))) {
      return null;
    }

    // Extract API key
    const apiKeyData = this.extractApiKey(request);
    if (!apiKeyData) {
      return NextResponse.json(
        { error: 'Missing or invalid API key' },
        { status: 401 }
      );
    }

    // Get merchant data
    const merchant = await this.getMerchant(apiKeyData.key, apiKeyData.type);
    if (!merchant) {
      return NextResponse.json(
        { error: 'Invalid API key or inactive merchant' },
        { status: 401 }
      );
    }

    // Validate merchant permissions
    if (!this.validatePermissions(merchant, request)) {
      return NextResponse.json(
        { 
          error: 'Insufficient permissions',
          details: merchant.kycStatus !== 'verified' 
            ? 'KYC verification required' 
            : 'Invalid operation for test mode'
        },
        { status: 403 }
      );
    }

    // Check rate limits
    if (!this.checkRateLimit(merchant.id, merchant.plan)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }

    // Log usage for billing
    await this.logUsage(merchant.id, pathname);

    // Add merchant context to request headers
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-merchant-id', merchant.id);
    requestHeaders.set('x-merchant-test-mode', merchant.testMode.toString());
    requestHeaders.set('x-merchant-plan', merchant.plan);

    // Continue to the next middleware/handler
    return NextResponse.next({
      request: {
        headers: requestHeaders
      }
    });
  }
}

// Utility functions for API routes
export function getMerchantIdFromRequest(request: NextRequest | Request): string | null {
  if ('headers' in request && typeof request.headers.get === 'function') {
    return request.headers.get('x-merchant-id');
  }
  return null;
}

export function getMerchantTestMode(request: NextRequest | Request): boolean {
  if ('headers' in request && typeof request.headers.get === 'function') {
    return request.headers.get('x-merchant-test-mode') === 'true';
  }
  return false;
}

export function getMerchantPlan(request: NextRequest | Request): string {
  if ('headers' in request && typeof request.headers.get === 'function') {
    return request.headers.get('x-merchant-plan') || 'starter';
  }
  return 'starter';
}

// Create singleton instance
export const multitenantMiddleware = new MultitenantMiddleware();

// Helper for API routes to ensure merchant context
export function requireMerchant(handler: (request: Request, context: { params?: any }) => Promise<Response>) {
  return async (request: Request, context: { params?: any }) => {
    const merchantId = getMerchantIdFromRequest(request);
    if (!merchantId) {
      return Response.json(
        { error: 'Merchant context required' },
        { status: 401 }
      );
    }
    return handler(request, context);
  };
}