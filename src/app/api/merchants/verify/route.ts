/**
 * Merchant KYC Verification API
 * POST /api/merchants/verify
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireMerchant, getMerchantIdFromRequest } from '@/middleware/multitenancy';
import { z } from 'zod';

// Validation schema for KYC verification
const KYCVerificationSchema = z.object({
  documents: z.object({
    businessLicense: z.object({
      type: z.string(),
      fileUrl: z.string().url(),
      number: z.string().optional()
    }).optional(),
    taxCertificate: z.object({
      type: z.string(),
      fileUrl: z.string().url(),
      number: z.string()
    }).optional(),
    bankStatement: z.object({
      fileUrl: z.string().url(),
      month: z.string(),
      year: z.number()
    }).optional(),
    identityDocument: z.object({
      type: z.enum(['passport', 'drivers_license', 'national_id']),
      fileUrl: z.string().url(),
      number: z.string(),
      expiryDate: z.string().optional()
    }),
    proofOfAddress: z.object({
      type: z.enum(['utility_bill', 'bank_statement', 'lease_agreement']),
      fileUrl: z.string().url(),
      date: z.string()
    })
  }),
  businessInfo: z.object({
    description: z.string().min(10, 'Business description must be at least 10 characters'),
    industry: z.string().min(1, 'Industry is required'),
    monthlyVolume: z.number().min(0),
    averageTransactionSize: z.number().min(0),
    primaryMarket: z.string().min(1),
    businessModel: z.string().min(10)
  }),
  compliance: z.object({
    antiMoneyLaundering: z.boolean().refine(val => val === true, {
      message: 'Must acknowledge AML compliance'
    }),
    dataProtection: z.boolean().refine(val => val === true, {
      message: 'Must acknowledge data protection compliance'
    }),
    sanctionsScreening: z.boolean().refine(val => val === true, {
      message: 'Must acknowledge sanctions screening'
    })
  }),
  bankingInfo: z.object({
    accountNumber: z.string().min(1, 'Account number is required'),
    routingNumber: z.string().min(1, 'Routing number is required'),
    bankName: z.string().min(1, 'Bank name is required'),
    accountType: z.enum(['checking', 'savings', 'business'])
  }).optional()
});

/**
 * Calculate KYC completion score
 */
function calculateKYCScore(data: any): number {
  let score = 0;
  const maxScore = 100;
  
  // Document verification (60%)
  const requiredDocs = ['identityDocument', 'proofOfAddress'];
  const optionalDocs = ['businessLicense', 'taxCertificate', 'bankStatement'];
  
  requiredDocs.forEach(doc => {
    if (data.documents[doc]) score += 20;
  });
  
  optionalDocs.forEach(doc => {
    if (data.documents[doc]) score += 6.67;
  });
  
  // Business information completeness (25%)
  const businessFields = Object.keys(data.businessInfo);
  score += (businessFields.length / 6) * 25;
  
  // Banking information (15%)
  if (data.bankingInfo) {
    score += 15;
  }
  
  return Math.min(Math.round(score), maxScore);
}

/**
 * Determine KYC status based on score and risk factors
 */
function determineKYCStatus(score: number, riskScore: number): string {
  if (score >= 90 && riskScore <= 20) {
    return 'verified';
  } else if (score >= 70) {
    return 'in_review';
  } else {
    return 'pending';
  }
}

export const POST = requireMerchant(async (request: Request) => {
  try {
    const merchantId = getMerchantIdFromRequest(request);
    if (!merchantId) {
      return Response.json({ error: 'Merchant context required' }, { status: 401 });
    }
    
    const body = await request.json();
    
    // Validate input
    const validationResult = KYCVerificationSchema.safeParse(body);
    if (!validationResult.success) {
      return Response.json(
        { 
          error: 'Invalid input',
          details: validationResult.error.flatten().fieldErrors 
        },
        { status: 400 }
      );
    }
    
    const data = validationResult.data;
    
    // Get current merchant
    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      select: {
        id: true,
        email: true,
        companyName: true,
        kycStatus: true,
        riskScore: true,
        verificationDocs: true
      }
    });
    
    if (!merchant) {
      return Response.json({ error: 'Merchant not found' }, { status: 404 });
    }
    
    // Check if already verified
    if (merchant.kycStatus === 'verified') {
      return Response.json(
        { error: 'Merchant is already verified' },
        { status: 409 }
      );
    }
    
    // Calculate KYC completion score
    const kycScore = calculateKYCScore(data);
    
    // Determine new KYC status
    const newKYCStatus = determineKYCStatus(kycScore, merchant.riskScore);
    
    // Update merchant with verification data
    const updatedMerchant = await prisma.merchant.update({
      where: { id: merchantId },
      data: {
        kycStatus: newKYCStatus,
        verificationDocs: {
          ...data.documents,
          submittedAt: new Date().toISOString(),
          kycScore,
          businessInfo: data.businessInfo,
          compliance: data.compliance,
          bankingInfo: data.bankingInfo
        },
        // If verified, set onboarding completion date
        ...(newKYCStatus === 'verified' && {
          onboardedAt: new Date()
        })
      },
      select: {
        id: true,
        email: true,
        companyName: true,
        kycStatus: true,
        onboardedAt: true,
        createdAt: true
      }
    });
    
    // Log KYC submission
    await prisma.auditLog.create({
      data: {
        merchantId,
        tableName: 'merchants',
        recordId: merchantId,
        action: 'UPDATE',
        newValues: { 
          kycStatus: newKYCStatus,
          kycScore,
          verificationSubmitted: true 
        },
        ipAddress: request.headers.get('x-forwarded-for') || 
                  request.headers.get('x-real-ip') || 
                  'unknown'
      }
    });
    
    // Create support ticket for manual review if needed
    if (newKYCStatus === 'in_review') {
      await prisma.supportTicket.create({
        data: {
          merchantId,
          subject: `KYC Review Required - ${merchant.companyName}`,
          description: `Merchant ${merchant.email} has submitted KYC documents for review. Score: ${kycScore}/100, Risk Score: ${merchant.riskScore}/100`,
          category: 'technical',
          priority: 'medium',
          status: 'open'
        }
      });
    }
    
    // Send notification email (TODO: implement)
    // await sendKYCStatusEmail(merchant.email, newKYCStatus);
    
    const response = {
      success: true,
      merchant: updatedMerchant,
      verification: {
        status: newKYCStatus,
        score: kycScore,
        submittedAt: new Date().toISOString(),
        estimatedReviewTime: newKYCStatus === 'in_review' ? '1-3 business days' : null
      },
      nextSteps: getNextSteps(newKYCStatus)
    };
    
    return Response.json(response, { status: 200 });
    
  } catch (error) {
    console.error('KYC verification error:', error);
    
    // Log error
    try {
      await prisma.errorReport.create({
        data: {
          merchantId: getMerchantIdFromRequest(request),
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack || '' : '',
          url: request.url,
          severity: 'high',
          timestamp: new Date(),
          context: { 
            endpoint: 'kyc-verification'
          }
        }
      });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }
    
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});

/**
 * Get next steps based on KYC status
 */
function getNextSteps(status: string): string[] {
  switch (status) {
    case 'verified':
      return [
        'Configure production API keys',
        'Set up webhook endpoints',
        'Complete integration testing',
        'Go live with payments'
      ];
    case 'in_review':
      return [
        'Wait for manual review (1-3 business days)',
        'Check email for any additional requirements',
        'Continue testing with sandbox environment'
      ];
    default:
      return [
        'Submit missing documents',
        'Complete business information',
        'Ensure all compliance requirements are met'
      ];
  }
}