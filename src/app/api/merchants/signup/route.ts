/**
 * Merchant Onboarding API - Signup Endpoint
 * POST /api/merchants/signup
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

// Validation schema for merchant signup
const SignupSchema = z.object({
  email: z.string().email('Invalid email address'),
  companyName: z.string().min(1, 'Company name is required').max(100),
  businessType: z.enum(['individual', 'llc', 'corporation', 'non_profit']),
  taxId: z.string().optional(),
  website: z.string().url().optional(),
  country: z.string().default('MX'),
  currency: z.string().default('MXN'),
  timezone: z.string().default('America/Mexico_City'),
  billingEmail: z.string().email('Invalid billing email'),
  billingAddress: z.object({
    street: z.string().min(1),
    city: z.string().min(1),
    state: z.string().min(1),
    zipCode: z.string().min(1),
    country: z.string().min(1)
  }),
  agreeToTerms: z.boolean().refine(val => val === true, {
    message: 'Must agree to terms and conditions'
  })
});

/**
 * Generate secure API keys
 */
function generateApiKeys(testMode: boolean = true) {
  const prefix = testMode ? 'pk_test_' : 'pk_live_';
  const secretPrefix = testMode ? 'sk_test_' : 'sk_live_';
  
  const publicKey = prefix + crypto.randomBytes(24).toString('hex');
  const secretKey = secretPrefix + crypto.randomBytes(24).toString('hex');
  const webhookSecret = 'whsec_' + crypto.randomBytes(32).toString('hex');
  
  return { publicKey, secretKey, webhookSecret };
}

/**
 * Generate initial risk score based on signup data
 */
function calculateInitialRiskScore(data: any): number {
  let score = 0;
  
  // Email domain check (temporary heuristic)
  const suspiciousDomains = ['tempmail.com', '10minutemail.com', 'guerrillamail.com'];
  const emailDomain = data.email.split('@')[1];
  if (suspiciousDomains.includes(emailDomain)) {
    score += 30;
  }
  
  // Business type risk
  const riskByType: Record<string, number> = {
    individual: 20,
    llc: 10,
    corporation: 5,
    non_profit: 15
  };
  score += riskByType[data.businessType] || 20;
  
  // Missing tax ID (higher risk)
  if (!data.taxId && data.businessType !== 'individual') {
    score += 15;
  }
  
  // No website (higher risk for businesses)
  if (!data.website && data.businessType !== 'individual') {
    score += 10;
  }
  
  return Math.min(score, 100);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validationResult = SignupSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid input',
          details: validationResult.error.flatten().fieldErrors 
        },
        { status: 400 }
      );
    }
    
    const data = validationResult.data;
    
    // Check if merchant already exists
    const existingMerchant = await prisma.merchant.findUnique({
      where: { email: data.email }
    });
    
    if (existingMerchant) {
      return NextResponse.json(
        { error: 'A merchant account with this email already exists' },
        { status: 409 }
      );
    }
    
    // Generate API keys (start in test mode)
    const { publicKey, secretKey, webhookSecret } = generateApiKeys(true);
    
    // Calculate initial risk score
    const riskScore = calculateInitialRiskScore(data);
    
    // Create merchant account
    const merchant = await prisma.merchant.create({
      data: {
        email: data.email,
        companyName: data.companyName,
        businessType: data.businessType,
        taxId: data.taxId,
        website: data.website,
        country: data.country,
        currency: data.currency,
        timezone: data.timezone,
        billingEmail: data.billingEmail,
        billingAddress: data.billingAddress,
        publicKey,
        secretKey,
        webhookSecret,
        testMode: true,
        plan: 'starter',
        kycStatus: 'pending',
        riskScore,
        status: 'active',
        settings: {
          webhookEvents: [],
          allowTestTransactions: true,
          requireTwoFactor: false,
          ipWhitelist: [],
          customBranding: {
            enabled: false,
            logoUrl: null,
            brandColor: '#6366F1'
          }
        }
      },
      select: {
        id: true,
        email: true,
        companyName: true,
        businessType: true,
        country: true,
        currency: true,
        publicKey: true, // Safe to return public key
        testMode: true,
        plan: true,
        kycStatus: true,
        status: true,
        createdAt: true
      }
    });
    
    // Log merchant creation
    await prisma.auditLog.create({
      data: {
        merchantId: merchant.id,
        tableName: 'merchants',
        recordId: merchant.id,
        action: 'CREATE',
        newValues: { merchantCreated: true },
        ipAddress: request.headers.get('x-forwarded-for') || 
                  request.headers.get('x-real-ip') || 
                  'unknown'
      }
    });
    
    // Send welcome email (TODO: implement email service)
    // await sendWelcomeEmail(merchant.email, merchant.companyName);
    
    return NextResponse.json({
      success: true,
      merchant: {
        ...merchant,
        // Include next steps
        nextSteps: [
          'Complete KYC verification',
          'Configure webhook endpoints',
          'Test API integration',
          'Set up billing information'
        ],
        documentation: {
          apiDocs: `${process.env.NEXT_PUBLIC_APP_URL}/docs`,
          quickStart: `${process.env.NEXT_PUBLIC_APP_URL}/docs/quickstart`,
          sdks: `${process.env.NEXT_PUBLIC_APP_URL}/docs/sdks`
        }
      }
    }, { status: 201 });
    
  } catch (error) {
    console.error('Merchant signup error:', error);
    
    // Log error for monitoring
    try {
      await prisma.errorReport.create({
        data: {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack || '' : '',
          url: request.url,
          severity: 'high',
          timestamp: new Date(),
          context: { 
            endpoint: 'merchant-signup',
            userAgent: request.headers.get('user-agent') || ''
          }
        }
      });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}