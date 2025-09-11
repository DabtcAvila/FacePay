import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createErrorResponse, createSuccessResponse } from '@/lib/auth-middleware'
import { paymentSecurity } from '@/middleware/security'
import { validatePaymentIntent } from '@/middleware/validation'
import { requireAuth } from '@/middleware/auth'

export const dynamic = 'force-dynamic'
import { 
  logPaymentFraud, 
  logSuspiciousActivity,
  analyzeThreatLevel,
  SecuritySeverity 
} from '@/lib/security-logger'
import { analytics, EVENTS, FUNNELS } from '@/lib/analytics'
import { monitoring } from '@/lib/monitoring'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

// Payment fraud detection thresholds
const FRAUD_THRESHOLDS = {
  MAX_AMOUNT_PER_TRANSACTION: 10000, // $10,000
  MAX_AMOUNT_PER_HOUR: 50000, // $50,000 per hour
  MAX_TRANSACTIONS_PER_HOUR: 20,
  SUSPICIOUS_AMOUNT_PATTERNS: [100, 200, 500, 1000, 1500, 2000] // Common fraud test amounts
}

async function createPaymentIntentHandler(request: NextRequest) {
  const startTime = Date.now();
  let auth: any = null;
  let userAgent: string | undefined;
  let userIP: string | undefined;
  
  try {
    // Extract request metadata for tracking
    userAgent = request.headers.get('user-agent') || undefined;
    userIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined;

    auth = await requireAuth(request)
    if (auth.error) return auth.error

    // Track payment funnel step 1 - Payment Initiated
    analytics.trackFunnelStep(FUNNELS.PAYMENT, 'payment_initiated', 1, {
      user_id: auth.user.userId,
      user_agent: userAgent,
      ip_address: userIP,
      timestamp: new Date().toISOString()
    });

    analytics.track(EVENTS.PAYMENT_INITIATED, {
      user_id: auth.user.userId,
      initiated_at: new Date().toISOString()
    });

    // Analyze request for threats
    const threatAnalysis = analyzeThreatLevel(request)
    if (threatAnalysis.shouldBlock) {
      // Track payment security block
      analytics.track('Payment Blocked', {
        reason: 'threat_analysis',
        user_id: auth.user.userId,
        threats: threatAnalysis.threats,
        funnel: FUNNELS.PAYMENT,
        step: 'security_check'
      });

      logPaymentFraud(request, { reason: 'Threat analysis blocked request', threats: threatAnalysis.threats }, auth.user.userId)
      return createErrorResponse('Request blocked due to security concerns', 403)
    }

    // Validate payment intent data
    const validation = await validatePaymentIntent(request)
    if (validation.error) {
      // Track validation error
      analytics.track('Payment Failed', {
        reason: 'validation_error',
        user_id: auth.user.userId,
        funnel: FUNNELS.PAYMENT,
        step: 'validation'
      });
      
      return validation.error
    }
    
    const { amount, currency, paymentMethodId, description, metadata } = validation.data

    // Track payment funnel step 2 - Validation Passed
    analytics.trackFunnelStep(FUNNELS.PAYMENT, 'validation_passed', 2, {
      user_id: auth.user.userId,
      amount,
      currency: currency || 'USD',
      has_payment_method: !!paymentMethodId,
      payment_method_id: paymentMethodId
    });

    // Fraud detection checks
    const fraudCheckResult = await performFraudChecks(auth.user.userId, amount, request)
    if (!fraudCheckResult.allowed) {
      // Track fraud detection block
      analytics.track('Payment Blocked', {
        reason: 'fraud_detection',
        user_id: auth.user.userId,
        fraud_reason: fraudCheckResult.reason,
        amount,
        currency: currency || 'USD',
        details: fraudCheckResult.details,
        funnel: FUNNELS.PAYMENT,
        step: 'fraud_check'
      });

      logPaymentFraud(request, { 
        reason: fraudCheckResult.reason, 
        amount, 
        currency, 
        details: fraudCheckResult.details 
      }, auth.user.userId)
      return createErrorResponse(`Payment blocked: ${fraudCheckResult.reason}`, 403)
    }

    // Track payment funnel step 3 - Security Checks Passed
    analytics.trackFunnelStep(FUNNELS.PAYMENT, 'security_checks_passed', 3, {
      user_id: auth.user.userId,
      amount,
      currency: currency || 'USD'
    });

    // Convert amount to cents (Stripe expects amounts in smallest currency unit)
    const amountInCents = Math.round(amount * 100)

    // Create payment intent
    const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
      amount: amountInCents,
      currency: (currency || 'usd').toLowerCase(),
      customer: auth.user.userId, // In production, use Stripe customer ID
      metadata: {
        userId: auth.user.userId,
        ...metadata,
      },
      ...(description && { description }),
    }

    if (paymentMethodId) {
      paymentIntentParams.payment_method = paymentMethodId
      paymentIntentParams.confirmation_method = 'manual'
      paymentIntentParams.confirm = true
      paymentIntentParams.return_url = `${process.env.NEXT_PUBLIC_BASE_URL}/payments/success`
    }

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams)

    // Create transaction record
    let paymentMethod = null
    if (paymentMethodId) {
      paymentMethod = await prisma.paymentMethod.findFirst({
        where: {
          userId: auth.user.userId,
          details: {
            path: ['stripePaymentMethodId'],
            equals: paymentMethodId,
          },
        },
      })
    }

    const transaction = await prisma.transaction.create({
      data: {
        userId: auth.user.userId,
        amount: amount,
        currency: (currency || "USD").toUpperCase(),
        status: 'pending',
        paymentMethodId: paymentMethod?.id || 'stripe-temp',
        description: description || 'Stripe payment',
        metadata: {
          stripePaymentIntentId: paymentIntent.id,
          ...metadata,
        },
      },
    })

    // Track payment funnel step 4 - Payment Intent Created
    analytics.trackFunnelStep(FUNNELS.PAYMENT, 'payment_intent_created', 4, {
      user_id: auth.user.userId,
      payment_intent_id: paymentIntent.id,
      transaction_id: transaction.id,
      amount,
      currency: currency || 'USD',
      status: paymentIntent.status,
      creation_time_ms: Date.now() - startTime
    });

    // Track payment method if provided
    if (paymentMethod) {
      analytics.trackFeatureUsage('payment_methods', 'used_saved_method', {
        user_id: auth.user.userId,
        payment_method_id: paymentMethod.id,
        payment_method_type: paymentMethod.type
      });
    }

    // Add monitoring breadcrumb
    monitoring.addBreadcrumb(
      `Payment intent created: ${paymentIntent.id}`,
      'payment',
      'info',
      { 
        userId: auth.user.userId,
        paymentIntentId: paymentIntent.id,
        transactionId: transaction.id,
        amount,
        currency: currency || 'USD'
      }
    );

    // Track performance metric
    monitoring.trackPerformanceMetric('payment_intent_creation', Date.now() - startTime, {
      success: true,
      amount,
      has_payment_method: !!paymentMethodId
    });

    return createSuccessResponse({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      transactionId: transaction.id,
      status: paymentIntent.status,
    })

  } catch (error) {
    const duration = Date.now() - startTime;

    // Track payment system error
    analytics.track('Payment Failed', {
      reason: 'system_error',
      user_id: auth?.user?.userId,
      error_message: (error as Error).message,
      funnel: FUNNELS.PAYMENT,
      step: 'payment_intent_creation'
    });

    // Capture exception in monitoring
    monitoring.captureException(error as Error, {
      extra: {
        context: 'payment_intent_creation',
        user_id: auth?.user?.userId,
        user_agent: userAgent,
        ip_address: userIP,
        duration
      },
      tags: {
        endpoint: '/api/payments/stripe/payment-intent',
        operation: 'create_payment_intent'
      }
    });

    console.error('Payment intent error:', error)
    logSuspiciousActivity(request, 'Payment intent creation failed', auth?.user?.userId, SecuritySeverity.MEDIUM)
    return createErrorResponse('Failed to create payment intent', 500)
  }
}

// Fraud detection function
async function performFraudChecks(userId: string, amount: number, request: NextRequest): Promise<{
  allowed: boolean
  reason?: string
  details?: any
}> {
  const now = new Date()
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)

  try {
    // Check 1: Amount too high for single transaction
    if (amount > FRAUD_THRESHOLDS.MAX_AMOUNT_PER_TRANSACTION) {
      return {
        allowed: false,
        reason: 'Transaction amount exceeds maximum allowed limit',
        details: { amount, limit: FRAUD_THRESHOLDS.MAX_AMOUNT_PER_TRANSACTION }
      }
    }

    // Check 2: Suspicious amount patterns
    if (FRAUD_THRESHOLDS.SUSPICIOUS_AMOUNT_PATTERNS.includes(amount)) {
      const recentSimilarTransactions = await prisma.transaction.count({
        where: {
          userId,
          amount,
          createdAt: { gte: oneHourAgo }
        }
      })

      if (recentSimilarTransactions > 0) {
        return {
          allowed: false,
          reason: 'Suspicious repeated amount pattern detected',
          details: { amount, recentCount: recentSimilarTransactions }
        }
      }
    }

    // Check 3: Transaction frequency
    const recentTransactionCount = await prisma.transaction.count({
      where: {
        userId,
        createdAt: { gte: oneHourAgo }
      }
    })

    if (recentTransactionCount >= FRAUD_THRESHOLDS.MAX_TRANSACTIONS_PER_HOUR) {
      return {
        allowed: false,
        reason: 'Too many transactions in the last hour',
        details: { count: recentTransactionCount, limit: FRAUD_THRESHOLDS.MAX_TRANSACTIONS_PER_HOUR }
      }
    }

    // Check 4: Total amount in last hour
    const recentTransactionsSum = await prisma.transaction.aggregate({
      where: {
        userId,
        createdAt: { gte: oneHourAgo },
        status: { in: ['completed', 'pending'] }
      },
      _sum: { amount: true }
    })

    const totalAmountLastHour = (Number(recentTransactionsSum._sum.amount) || 0) + amount
    if (totalAmountLastHour > FRAUD_THRESHOLDS.MAX_AMOUNT_PER_HOUR) {
      return {
        allowed: false,
        reason: 'Total transaction amount in last hour exceeds limit',
        details: { 
          currentTotal: recentTransactionsSum._sum.amount || 0,
          newAmount: amount,
          projectedTotal: totalAmountLastHour,
          limit: FRAUD_THRESHOLDS.MAX_AMOUNT_PER_HOUR 
        }
      }
    }

    // All checks passed
    return { allowed: true }

  } catch (error) {
    console.error('Fraud check error:', error)
    // In case of error, allow transaction but log the issue
    logSuspiciousActivity(request, 'Fraud check system error', userId, SecuritySeverity.HIGH)
    return { allowed: true }
  }
}

async function confirmPaymentIntentHandler(request: NextRequest) {
  let auth: any = null;
  try {
    auth = await requireAuth(request)
    if (auth.error) return auth.error

    const body = await request.json()
    const { paymentIntentId } = body

    if (!paymentIntentId) {
      return createErrorResponse('Payment intent ID is required', 400)
    }

    // Security check: Ensure the payment intent belongs to the authenticated user
    const transaction = await prisma.transaction.findFirst({
      where: {
        userId: auth.user.userId,
        metadata: {
          path: ['stripePaymentIntentId'],
          equals: paymentIntentId,
        },
      }
    })

    if (!transaction) {
      logSuspiciousActivity(request, 'Attempted to confirm unowned payment intent', auth.user.userId, SecuritySeverity.HIGH)
      return createErrorResponse('Payment intent not found or access denied', 403)
    }

    // Confirm payment intent
    const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId)

    // Update transaction status
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: paymentIntent.status === 'succeeded' ? 'completed' : 'failed',
        completedAt: paymentIntent.status === 'succeeded' ? new Date() : null,
      },
    })

    return createSuccessResponse({
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
    })

  } catch (error) {
    console.error('Confirm payment intent error:', error)
    logSuspiciousActivity(request, 'Payment intent confirmation failed', auth?.user?.userId, SecuritySeverity.MEDIUM)
    return createErrorResponse('Failed to confirm payment intent', 500)
  }
}

// Apply security middleware and export handlers
export const POST = paymentSecurity(createPaymentIntentHandler)
export const PUT = paymentSecurity(confirmPaymentIntentHandler)