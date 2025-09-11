/**
 * API Key Management System
 * GET /api/merchants/keys - List merchant API keys
 * POST /api/merchants/keys - Create new API key
 * DELETE /api/merchants/keys - Revoke API key
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireMerchant, getMerchantIdFromRequest } from '@/middleware/multitenancy';
import { z } from 'zod';
import crypto from 'crypto';

// API Key creation schema
const CreateKeySchema = z.object({
  name: z.string().min(1, 'Key name is required').max(50),
  permissions: z.array(z.enum([
    'payments:read',
    'payments:write',
    'transactions:read',
    'transactions:write',
    'customers:read',
    'customers:write',
    'webhooks:read',
    'webhooks:write',
    'analytics:read',
    'refunds:write'
  ])).min(1, 'At least one permission is required'),
  expiresInDays: z.number().min(1).max(365).optional(),
  testMode: z.boolean().default(true)
});

// Key revocation schema
const RevokeKeySchema = z.object({
  keyId: z.string().min(1, 'Key ID is required')
});

export const GET = requireMerchant(async (request: Request) => {
  try {
    const merchantId = getMerchantIdFromRequest(request);
    if (!merchantId) {
      return Response.json({ error: 'Merchant context required' }, { status: 401 });
    }
    
    const url = new URL(request.url);
    const includeRevoked = url.searchParams.get('include_revoked') === 'true';
    
    const keys = await prisma.merchantApiKey.findMany({
      where: {
        merchantId,
        ...(includeRevoked ? {} : { isActive: true })
      },
      select: {
        id: true,
        keyId: true,
        name: true,
        permissions: true,
        lastUsedAt: true,
        lastUsedIp: true,
        expiresAt: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    // Add usage statistics for active keys
    const keysWithStats = await Promise.all(
      keys.map(async (key) => {
        if (!key.isActive) return { ...key, usage: null };
        
        // Get usage in last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const usage = await prisma.merchantUsage.aggregate({
          where: {
            merchantId,
            createdAt: { gte: thirtyDaysAgo },
            metric: 'api_calls'
          },
          _sum: { quantity: true }
        });
        
        return {
          ...key,
          usage: {
            last30Days: Number(usage._sum.quantity || 0),
            isExpired: key.expiresAt ? new Date() > key.expiresAt : false,
            isExpiringSoon: key.expiresAt 
              ? (key.expiresAt.getTime() - Date.now()) < (7 * 24 * 60 * 60 * 1000) 
              : false
          }
        };
      })
    );
    
    return Response.json({
      keys: keysWithStats,
      total: keys.length,
      active: keys.filter(k => k.isActive).length
    }, { status: 200 });
    
  } catch (error) {
    console.error('API keys list error:', error);
    return Response.json({ error: 'Failed to retrieve API keys' }, { status: 500 });
  }
});

export const POST = requireMerchant(async (request: Request) => {
  try {
    const merchantId = getMerchantIdFromRequest(request);
    if (!merchantId) {
      return Response.json({ error: 'Merchant context required' }, { status: 401 });
    }
    
    const body = await request.json();
    
    // Validate input
    const validationResult = CreateKeySchema.safeParse(body);
    if (!validationResult.success) {
      return Response.json(
        { 
          error: 'Invalid input',
          details: validationResult.error.flatten().fieldErrors 
        },
        { status: 400 }
      );
    }
    
    const { name, permissions, expiresInDays, testMode } = validationResult.data;
    
    // Check merchant plan limits
    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { plan: true, kycStatus: true }
    });
    
    if (!merchant) {
      return Response.json({ error: 'Merchant not found' }, { status: 404 });
    }
    
    // Enforce plan limits on number of API keys
    const existingKeysCount = await prisma.merchantApiKey.count({
      where: { merchantId, isActive: true }
    });
    
    const maxKeysAllowed = getMaxApiKeysForPlan(merchant.plan);
    if (existingKeysCount >= maxKeysAllowed) {
      return Response.json({
        error: 'API key limit reached',
        details: `${merchant.plan} plan allows maximum ${maxKeysAllowed} active keys`
      }, { status: 403 });
    }
    
    // Validate permissions for merchant status
    const validationError = validatePermissions(permissions, merchant.kycStatus, testMode);
    if (validationError) {
      return Response.json({ error: validationError }, { status: 403 });
    }
    
    // Generate API key
    const keyPrefix = testMode ? 'sk_test_' : 'sk_live_';
    const keyData = crypto.randomBytes(32).toString('hex');
    const keyId = crypto.randomBytes(8).toString('hex');
    const fullKey = keyPrefix + keyData;
    
    // Hash the key for storage
    const hashedKey = crypto.createHash('sha256').update(fullKey).digest('hex');
    
    // Calculate expiration date
    const expiresAt = expiresInDays 
      ? new Date(Date.now() + (expiresInDays * 24 * 60 * 60 * 1000))
      : null;
    
    // Create API key record
    const apiKey = await prisma.merchantApiKey.create({
      data: {
        merchantId,
        keyId,
        hashedKey,
        name,
        permissions,
        expiresAt,
        isActive: true
      },
      select: {
        id: true,
        keyId: true,
        name: true,
        permissions: true,
        expiresAt: true,
        createdAt: true
      }
    });
    
    // Log key creation
    await prisma.auditLog.create({
      data: {
        merchantId,
        tableName: 'merchant_api_keys',
        recordId: apiKey.id,
        action: 'CREATE',
        newValues: { 
          keyName: name,
          permissions,
          testMode 
        },
        ipAddress: request.headers.get('x-forwarded-for') || 
                  request.headers.get('x-real-ip') || 
                  'unknown'
      }
    });
    
    return Response.json({
      success: true,
      key: {
        ...apiKey,
        // Return the full key only once during creation
        secretKey: fullKey
      },
      warning: 'Store this key securely. It will not be shown again.',
      usage: {
        testMode,
        permissions: permissions.map(p => ({
          permission: p,
          description: getPermissionDescription(p)
        }))
      }
    }, { status: 201 });
    
  } catch (error) {
    console.error('API key creation error:', error);
    
    // Log error
    try {
      await prisma.errorReport.create({
        data: {
          merchantId: getMerchantIdFromRequest(request),
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack || '' : '',
          url: request.url,
          severity: 'medium',
          timestamp: new Date(),
          context: { 
            endpoint: 'api-key-creation'
          }
        }
      });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }
    
    return Response.json({ error: 'Failed to create API key' }, { status: 500 });
  }
});

export const DELETE = requireMerchant(async (request: Request) => {
  try {
    const merchantId = getMerchantIdFromRequest(request);
    if (!merchantId) {
      return Response.json({ error: 'Merchant context required' }, { status: 401 });
    }
    
    const body = await request.json();
    
    // Validate input
    const validationResult = RevokeKeySchema.safeParse(body);
    if (!validationResult.success) {
      return Response.json(
        { 
          error: 'Invalid input',
          details: validationResult.error.flatten().fieldErrors 
        },
        { status: 400 }
      );
    }
    
    const { keyId } = validationResult.data;
    
    // Find and revoke the key
    const apiKey = await prisma.merchantApiKey.findFirst({
      where: {
        merchantId,
        keyId,
        isActive: true
      }
    });
    
    if (!apiKey) {
      return Response.json({ error: 'API key not found or already revoked' }, { status: 404 });
    }
    
    // Revoke the key
    await prisma.merchantApiKey.update({
      where: { id: apiKey.id },
      data: { 
        isActive: false,
        updatedAt: new Date()
      }
    });
    
    // Log key revocation
    await prisma.auditLog.create({
      data: {
        merchantId,
        tableName: 'merchant_api_keys',
        recordId: apiKey.id,
        action: 'UPDATE',
        oldValues: { isActive: true },
        newValues: { isActive: false },
        ipAddress: request.headers.get('x-forwarded-for') || 
                  request.headers.get('x-real-ip') || 
                  'unknown'
      }
    });
    
    return Response.json({
      success: true,
      message: 'API key revoked successfully',
      revokedKey: {
        keyId: apiKey.keyId,
        name: apiKey.name,
        revokedAt: new Date().toISOString()
      }
    }, { status: 200 });
    
  } catch (error) {
    console.error('API key revocation error:', error);
    return Response.json({ error: 'Failed to revoke API key' }, { status: 500 });
  }
});

/**
 * Get maximum API keys allowed per plan
 */
function getMaxApiKeysForPlan(plan: string): number {
  const limits: Record<string, number> = {
    starter: 3,
    growth: 10,
    enterprise: 50
  };
  return limits[plan] || limits.starter;
}

/**
 * Validate permissions based on merchant status
 */
function validatePermissions(permissions: string[], kycStatus: string, testMode: boolean): string | null {
  // Production permissions require KYC verification
  if (!testMode && kycStatus !== 'verified') {
    return 'Production API keys require KYC verification';
  }
  
  // Sensitive permissions require verification
  const sensitivePermissions = ['transactions:write', 'refunds:write'];
  const hasSensitivePermissions = permissions.some(p => sensitivePermissions.includes(p));
  
  if (hasSensitivePermissions && kycStatus !== 'verified') {
    return 'Write permissions require KYC verification';
  }
  
  return null;
}

/**
 * Get human-readable description for permissions
 */
function getPermissionDescription(permission: string): string {
  const descriptions: Record<string, string> = {
    'payments:read': 'View payment information and status',
    'payments:write': 'Create and process payments',
    'transactions:read': 'View transaction history and details',
    'transactions:write': 'Create and modify transactions',
    'customers:read': 'View customer information',
    'customers:write': 'Create and update customer records',
    'webhooks:read': 'View webhook configurations and logs',
    'webhooks:write': 'Create and manage webhook endpoints',
    'analytics:read': 'Access analytics and reporting data',
    'refunds:write': 'Process refunds and reversals'
  };
  
  return descriptions[permission] || 'Unknown permission';
}