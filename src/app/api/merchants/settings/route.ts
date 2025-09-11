/**
 * Merchant Settings API
 * GET /api/merchants/settings - Get merchant settings
 * PUT /api/merchants/settings - Update merchant settings
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireMerchant, getMerchantIdFromRequest } from '@/middleware/multitenancy';
import { z } from 'zod';

// Settings validation schema
const SettingsUpdateSchema = z.object({
  general: z.object({
    companyName: z.string().min(1).max(100).optional(),
    website: z.string().url().optional(),
    timezone: z.string().optional(),
    currency: z.string().length(3).optional(), // ISO 4217
    billingEmail: z.string().email().optional()
  }).optional(),
  
  webhooks: z.object({
    events: z.array(z.enum([
      'payment.succeeded',
      'payment.failed', 
      'payment.refunded',
      'customer.created',
      'customer.updated',
      'dispute.created'
    ])).optional(),
    retryCount: z.number().min(0).max(10).optional(),
    timeout: z.number().min(1000).max(30000).optional() // milliseconds
  }).optional(),
  
  security: z.object({
    requireTwoFactor: z.boolean().optional(),
    ipWhitelist: z.array(z.string().ip()).optional(),
    allowedDomains: z.array(z.string().url()).optional(),
    sessionTimeout: z.number().min(300).max(86400).optional() // seconds
  }).optional(),
  
  branding: z.object({
    logoUrl: z.string().url().optional(),
    brandColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    customDomain: z.string().optional(),
    businessName: z.string().max(50).optional()
  }).optional(),
  
  notifications: z.object({
    email: z.object({
      transactions: z.boolean().optional(),
      disputes: z.boolean().optional(),
      systemAlerts: z.boolean().optional(),
      marketingUpdates: z.boolean().optional()
    }).optional(),
    webhook: z.object({
      failureAlerts: z.boolean().optional(),
      volumeAlerts: z.boolean().optional()
    }).optional()
  }).optional(),
  
  limits: z.object({
    dailyTransactionLimit: z.number().min(0).optional(),
    monthlyVolumeLimit: z.number().min(0).optional(),
    singleTransactionLimit: z.number().min(0).optional()
  }).optional()
});

export const GET = requireMerchant(async (request: Request) => {
  try {
    const merchantId = getMerchantIdFromRequest(request);
    if (!merchantId) {
      return Response.json({ error: 'Merchant context required' }, { status: 401 });
    }
    
    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      select: {
        id: true,
        email: true,
        companyName: true,
        website: true,
        timezone: true,
        currency: true,
        billingEmail: true,
        billingAddress: true,
        settings: true,
        logoUrl: true,
        brandColor: true,
        customDomain: true,
        plan: true,
        kycStatus: true,
        status: true,
        testMode: true
      }
    });
    
    if (!merchant) {
      return Response.json({ error: 'Merchant not found' }, { status: 404 });
    }
    
    // Structure settings response
    const settings = {
      general: {
        companyName: merchant.companyName,
        website: merchant.website,
        timezone: merchant.timezone,
        currency: merchant.currency,
        billingEmail: merchant.billingEmail,
        billingAddress: merchant.billingAddress
      },
      
      webhooks: {
        events: merchant.settings?.webhookEvents || [],
        retryCount: merchant.settings?.webhookRetryCount || 3,
        timeout: merchant.settings?.webhookTimeout || 5000
      },
      
      security: {
        requireTwoFactor: merchant.settings?.requireTwoFactor || false,
        ipWhitelist: merchant.settings?.ipWhitelist || [],
        allowedDomains: merchant.settings?.allowedDomains || [],
        sessionTimeout: merchant.settings?.sessionTimeout || 3600
      },
      
      branding: {
        logoUrl: merchant.logoUrl,
        brandColor: merchant.brandColor,
        customDomain: merchant.customDomain,
        businessName: merchant.settings?.businessName || merchant.companyName
      },
      
      notifications: {
        email: {
          transactions: merchant.settings?.emailNotifications?.transactions ?? true,
          disputes: merchant.settings?.emailNotifications?.disputes ?? true,
          systemAlerts: merchant.settings?.emailNotifications?.systemAlerts ?? true,
          marketingUpdates: merchant.settings?.emailNotifications?.marketingUpdates ?? false
        },
        webhook: {
          failureAlerts: merchant.settings?.webhookNotifications?.failureAlerts ?? true,
          volumeAlerts: merchant.settings?.webhookNotifications?.volumeAlerts ?? false
        }
      },
      
      limits: {
        dailyTransactionLimit: merchant.settings?.limits?.dailyTransactionLimit || 0,
        monthlyVolumeLimit: merchant.settings?.limits?.monthlyVolumeLimit || 0,
        singleTransactionLimit: merchant.settings?.limits?.singleTransactionLimit || 0
      },
      
      metadata: {
        plan: merchant.plan,
        kycStatus: merchant.kycStatus,
        status: merchant.status,
        testMode: merchant.testMode
      }
    };
    
    return Response.json({ settings }, { status: 200 });
    
  } catch (error) {
    console.error('Settings retrieval error:', error);
    return Response.json({ error: 'Failed to retrieve settings' }, { status: 500 });
  }
});

export const PUT = requireMerchant(async (request: Request) => {
  try {
    const merchantId = getMerchantIdFromRequest(request);
    if (!merchantId) {
      return Response.json({ error: 'Merchant context required' }, { status: 401 });
    }
    
    const body = await request.json();
    
    // Validate input
    const validationResult = SettingsUpdateSchema.safeParse(body);
    if (!validationResult.success) {
      return Response.json(
        { 
          error: 'Invalid input',
          details: validationResult.error.flatten().fieldErrors 
        },
        { status: 400 }
      );
    }
    
    const updates = validationResult.data;
    
    // Get current merchant
    const currentMerchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      select: {
        id: true,
        settings: true,
        plan: true,
        kycStatus: true
      }
    });
    
    if (!currentMerchant) {
      return Response.json({ error: 'Merchant not found' }, { status: 404 });
    }
    
    // Validate plan limits
    const planLimits = getPlanLimits(currentMerchant.plan);
    if (updates.limits) {
      const validation = validateLimitsAgainstPlan(updates.limits, planLimits);
      if (!validation.valid) {
        return Response.json({
          error: 'Limits exceed plan allowances',
          details: validation.errors
        }, { status: 403 });
      }
    }
    
    // Merge settings with existing settings
    const currentSettings = currentMerchant.settings as any || {};
    const updatedSettings = {
      ...currentSettings,
      ...(updates.webhooks && {
        webhookEvents: updates.webhooks.events || currentSettings.webhookEvents,
        webhookRetryCount: updates.webhooks.retryCount || currentSettings.webhookRetryCount,
        webhookTimeout: updates.webhooks.timeout || currentSettings.webhookTimeout
      }),
      ...(updates.security && {
        requireTwoFactor: updates.security.requireTwoFactor ?? currentSettings.requireTwoFactor,
        ipWhitelist: updates.security.ipWhitelist || currentSettings.ipWhitelist,
        allowedDomains: updates.security.allowedDomains || currentSettings.allowedDomains,
        sessionTimeout: updates.security.sessionTimeout || currentSettings.sessionTimeout
      }),
      ...(updates.branding && {
        businessName: updates.branding.businessName || currentSettings.businessName
      }),
      ...(updates.notifications && {
        emailNotifications: {
          ...currentSettings.emailNotifications,
          ...updates.notifications.email
        },
        webhookNotifications: {
          ...currentSettings.webhookNotifications,
          ...updates.notifications.webhook
        }
      }),
      ...(updates.limits && {
        limits: {
          ...currentSettings.limits,
          ...updates.limits
        }
      })
    };
    
    // Build update object
    const updateData: any = {
      settings: updatedSettings
    };
    
    // Add direct field updates
    if (updates.general) {
      if (updates.general.companyName) updateData.companyName = updates.general.companyName;
      if (updates.general.website) updateData.website = updates.general.website;
      if (updates.general.timezone) updateData.timezone = updates.general.timezone;
      if (updates.general.currency) updateData.currency = updates.general.currency;
      if (updates.general.billingEmail) updateData.billingEmail = updates.general.billingEmail;
    }
    
    if (updates.branding) {
      if (updates.branding.logoUrl) updateData.logoUrl = updates.branding.logoUrl;
      if (updates.branding.brandColor) updateData.brandColor = updates.branding.brandColor;
      if (updates.branding.customDomain) updateData.customDomain = updates.branding.customDomain;
    }
    
    // Update merchant
    const updatedMerchant = await prisma.merchant.update({
      where: { id: merchantId },
      data: updateData,
      select: {
        id: true,
        companyName: true,
        website: true,
        timezone: true,
        currency: true,
        logoUrl: true,
        brandColor: true,
        customDomain: true,
        settings: true,
        updatedAt: true
      }
    });
    
    // Log settings update
    await prisma.auditLog.create({
      data: {
        merchantId,
        tableName: 'merchants',
        recordId: merchantId,
        action: 'UPDATE',
        oldValues: { settings: currentSettings },
        newValues: { settings: updatedSettings },
        ipAddress: request.headers.get('x-forwarded-for') || 
                  request.headers.get('x-real-ip') || 
                  'unknown'
      }
    });
    
    return Response.json({
      success: true,
      message: 'Settings updated successfully',
      merchant: updatedMerchant
    }, { status: 200 });
    
  } catch (error) {
    console.error('Settings update error:', error);
    
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
            endpoint: 'merchant-settings-update'
          }
        }
      });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }
    
    return Response.json({ error: 'Failed to update settings' }, { status: 500 });
  }
});

/**
 * Get plan-specific limits
 */
function getPlanLimits(plan: string) {
  const limits: Record<string, any> = {
    starter: {
      dailyTransactionLimit: 10000, // $100 equivalent
      monthlyVolumeLimit: 100000, // $1000 equivalent
      singleTransactionLimit: 5000, // $50 equivalent
      apiCallsPerMinute: 100
    },
    growth: {
      dailyTransactionLimit: 100000, // $1000 equivalent
      monthlyVolumeLimit: 1000000, // $10k equivalent
      singleTransactionLimit: 50000, // $500 equivalent
      apiCallsPerMinute: 500
    },
    enterprise: {
      dailyTransactionLimit: 10000000, // $100k equivalent
      monthlyVolumeLimit: 100000000, // $1M equivalent
      singleTransactionLimit: 1000000, // $10k equivalent
      apiCallsPerMinute: 2000
    }
  };
  
  return limits[plan] || limits.starter;
}

/**
 * Validate limits against plan
 */
function validateLimitsAgainstPlan(limits: any, planLimits: any) {
  const errors: string[] = [];
  
  if (limits.dailyTransactionLimit && limits.dailyTransactionLimit > planLimits.dailyTransactionLimit) {
    errors.push(`Daily transaction limit exceeds plan maximum of ${planLimits.dailyTransactionLimit}`);
  }
  
  if (limits.monthlyVolumeLimit && limits.monthlyVolumeLimit > planLimits.monthlyVolumeLimit) {
    errors.push(`Monthly volume limit exceeds plan maximum of ${planLimits.monthlyVolumeLimit}`);
  }
  
  if (limits.singleTransactionLimit && limits.singleTransactionLimit > planLimits.singleTransactionLimit) {
    errors.push(`Single transaction limit exceeds plan maximum of ${planLimits.singleTransactionLimit}`);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}