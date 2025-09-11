/**
 * API Key Rotation Endpoint
 * POST /api/merchants/keys/rotate
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireMerchant, getMerchantIdFromRequest } from '@/middleware/multitenancy';
import { z } from 'zod';
import crypto from 'crypto';

// Key rotation schema
const RotateKeySchema = z.object({
  keyId: z.string().min(1, 'Key ID is required'),
  gracePeriodHours: z.number().min(0).max(168).default(24) // Max 1 week grace period
});

export const POST = requireMerchant(async (request: Request) => {
  try {
    const merchantId = getMerchantIdFromRequest(request);
    if (!merchantId) {
      return Response.json({ error: 'Merchant context required' }, { status: 401 });
    }
    
    const body = await request.json();
    
    // Validate input
    const validationResult = RotateKeySchema.safeParse(body);
    if (!validationResult.success) {
      return Response.json(
        { 
          error: 'Invalid input',
          details: validationResult.error.flatten().fieldErrors 
        },
        { status: 400 }
      );
    }
    
    const { keyId, gracePeriodHours } = validationResult.data;
    
    // Find the existing key
    const existingKey = await prisma.merchantApiKey.findFirst({
      where: {
        merchantId,
        keyId,
        isActive: true
      }
    });
    
    if (!existingKey) {
      return Response.json({ error: 'API key not found or already revoked' }, { status: 404 });
    }
    
    // Generate new API key with same permissions
    const keyPrefix = existingKey.hashedKey.includes('test') ? 'sk_test_' : 'sk_live_';
    const keyData = crypto.randomBytes(32).toString('hex');
    const newKeyId = crypto.randomBytes(8).toString('hex');
    const fullKey = keyPrefix + keyData;
    const hashedKey = crypto.createHash('sha256').update(fullKey).digest('hex');
    
    // Calculate when old key expires
    const oldKeyExpiresAt = new Date(Date.now() + (gracePeriodHours * 60 * 60 * 1000));
    
    await prisma.$transaction(async (tx) => {
      // Create new API key
      await tx.merchantApiKey.create({
        data: {
          merchantId,
          keyId: newKeyId,
          hashedKey,
          name: `${existingKey.name} (Rotated)`,
          permissions: existingKey.permissions,
          expiresAt: existingKey.expiresAt,
          isActive: true
        }
      });
      
      // Update old key with grace period expiration
      await tx.merchantApiKey.update({
        where: { id: existingKey.id },
        data: {
          name: `${existingKey.name} (Deprecated)`,
          expiresAt: oldKeyExpiresAt,
          updatedAt: new Date()
        }
      });
      
      // Log the rotation
      await tx.auditLog.create({
        data: {
          merchantId,
          tableName: 'merchant_api_keys',
          recordId: existingKey.id,
          action: 'UPDATE',
          oldValues: { keyId: existingKey.keyId },
          newValues: { 
            keyId: newKeyId,
            rotated: true,
            gracePeriodHours 
          },
          ipAddress: request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown'
        }
      });
    });
    
    return Response.json({
      success: true,
      message: 'API key rotated successfully',
      newKey: {
        keyId: newKeyId,
        secretKey: fullKey,
        name: `${existingKey.name} (Rotated)`,
        permissions: existingKey.permissions
      },
      oldKey: {
        keyId: existingKey.keyId,
        expiresAt: oldKeyExpiresAt.toISOString(),
        gracePeriodHours
      },
      warning: 'Store the new key securely. The old key will be automatically revoked after the grace period.'
    }, { status: 200 });
    
  } catch (error) {
    console.error('API key rotation error:', error);
    return Response.json({ error: 'Failed to rotate API key' }, { status: 500 });
  }
});