import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { webhookSecurity } from '@/middleware/security'
import { logSuspiciousActivity, SecuritySeverity } from '@/lib/security-logger'
import { analytics, EVENTS, FUNNELS } from '@/lib/analytics'
import { monitoring } from '@/lib/monitoring'
import Stripe from 'stripe'
import { headers } from 'next/headers'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

async function webhookHandler(request: NextRequest) {
  try {
    const body = await request.text()
    const headersList = headers()
    const signature = headersList.get('stripe-signature')

    if (!signature) {
      console.error('No stripe signature found')
      logSuspiciousActivity(request, 'Webhook request without Stripe signature', undefined, SecuritySeverity.HIGH)
      return new NextResponse('No signature', { status: 400 })
    }

    // Additional security: Check if request is from Stripe's IP ranges (optional)
    const clientIP = getClientIP(request)
    if (!isValidStripeIP(clientIP)) {
      console.warn('Webhook from non-Stripe IP:', clientIP)
      logSuspiciousActivity(request, `Webhook from suspicious IP: ${clientIP}`, undefined, SecuritySeverity.MEDIUM)
      // Don't block here as Stripe IPs can change, but log for monitoring
    }

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      logSuspiciousActivity(request, `Invalid webhook signature: ${err}`, undefined, SecuritySeverity.HIGH)
      return new NextResponse('Invalid signature', { status: 400 })
    }

    console.log('Received webhook event:', event.type)

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session)
        break

      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent)
        break

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent)
        break

      case 'payment_method.attached':
        await handlePaymentMethodAttached(event.data.object as Stripe.PaymentMethod)
        break

      case 'customer.created':
        await handleCustomerCreated(event.data.object as Stripe.Customer)
        break

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice)
        break

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)
        break

      default:
        console.log('Unhandled event type:', event.type)
    }

    return new NextResponse('Webhook received', { status: 200 })

  } catch (error) {
    console.error('Webhook processing error:', error)
    logSuspiciousActivity(request, `Webhook processing error: ${error}`, undefined, SecuritySeverity.MEDIUM)
    return new NextResponse('Webhook error', { status: 500 })
  }
}

// Helper functions
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const real = request.headers.get('x-real-ip')
  const connectingIP = request.headers.get('x-connecting-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  return real || connectingIP || 'unknown'
}

// Basic Stripe IP validation (simplified - in production use official Stripe IP ranges)
function isValidStripeIP(ip: string): boolean {
  // Stripe's known IP ranges (simplified - update with official ranges)
  const stripeIPRanges = [
    '54.187.174.', '54.187.205.', '54.187.216.', '54.241.31.',
    '52.14.14.', '52.89.214.', '54.148.220.', '54.241.32.'
  ]
  
  // If IP is unknown, allow it (common in development)
  if (ip === 'unknown') return true
  
  return stripeIPRanges.some(range => ip.startsWith(range))
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  try {
    console.log('Processing checkout session completed:', session.id)

    // Find the transaction by session ID
    const transaction = await prisma.transaction.findFirst({
      where: {
        metadata: {
          path: ['stripeSessionId'],
          equals: session.id,
        },
      },
    })

    if (!transaction) {
      console.error('Transaction not found for session:', session.id)
      return
    }

    // Update transaction status
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: 'completed',
        completedAt: new Date(),
        metadata: {
          ...transaction.metadata as object,
          paymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id || null,
          customerId: typeof session.customer === 'string' ? session.customer : (session.customer as any)?.id || null,
          paymentStatus: session.payment_status,
        },
      },
    })

    // If there's a setup intent, save the payment method
    if (session.setup_intent && session.customer) {
      const setupIntent = await stripe.setupIntents.retrieve(session.setup_intent as string)
      if (setupIntent.payment_method) {
        await savePaymentMethod(
          transaction.userId,
          setupIntent.payment_method as string,
          session.customer as string
        )
      }
    }

    console.log('Transaction updated successfully:', transaction.id)

  } catch (error) {
    console.error('Error handling checkout session completed:', error)
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const startTime = Date.now();
  
  try {
    console.log('Processing payment intent succeeded:', paymentIntent.id)

    // Find and update transactions with this payment intent
    const transactions = await prisma.transaction.findMany({
      where: {
        metadata: {
          path: ['stripePaymentIntentId'],
          equals: paymentIntent.id,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        },
        paymentMethod: {
          select: {
            id: true,
            type: true,
            provider: true
          }
        }
      }
    })

    if (transactions.length === 0) {
      console.warn('No transactions found for payment intent:', paymentIntent.id)
      return
    }

    // Update transaction status
    await prisma.transaction.updateMany({
      where: {
        metadata: {
          path: ['stripePaymentIntentId'],
          equals: paymentIntent.id,
        },
      },
      data: {
        status: 'completed',
        completedAt: new Date(),
      },
    })

    // Track payment completion for each transaction
    for (const transaction of transactions) {
      const completionData = {
        user_id: transaction.userId,
        transaction_id: transaction.id,
        payment_intent_id: paymentIntent.id,
        amount: Number(transaction.amount),
        currency: transaction.currency,
        payment_method: paymentIntent.payment_method?.toString() || 'unknown',
        payment_method_type: transaction.paymentMethod?.type || 'unknown',
        completion_timestamp: new Date().toISOString(),
        processing_time_ms: Date.now() - startTime
      };

      // Track final payment funnel step - Payment Completed
      analytics.trackFunnelStep(FUNNELS.PAYMENT, 'payment_completed', 5, {
        ...completionData,
        success: true
      });

      // Track payment completion event
      analytics.track(EVENTS.PAYMENT_COMPLETED, {
        ...completionData,
        revenue: Number(transaction.amount)
      });

      // Track successful payment
      analytics.trackPayment(
        Number(transaction.amount),
        transaction.currency,
        transaction.paymentMethod?.type || 'stripe',
        true,
        {
          transaction_id: transaction.id,
          payment_intent_id: paymentIntent.id,
          payment_method_id: transaction.paymentMethodId,
          completion_timestamp: new Date().toISOString()
        }
      );

      // Set user context for analytics
      if (transaction.user) {
        analytics.identify(transaction.user.id, {
          email: transaction.user.email,
          name: transaction.user.name,
          last_payment_date: new Date().toISOString(),
          last_payment_amount: Number(transaction.amount),
          last_payment_currency: transaction.currency
        });

        // Set monitoring user context
        monitoring.setUser({
          id: transaction.user.id,
          email: transaction.user.email || '',
          username: transaction.user.name || transaction.user.email || ''
        });
      }

      // Add successful payment breadcrumb
      monitoring.addBreadcrumb(
        `Payment completed successfully: ${paymentIntent.id}`,
        'payment',
        'info',
        {
          userId: transaction.userId,
          transactionId: transaction.id,
          paymentIntentId: paymentIntent.id,
          amount: Number(transaction.amount),
          currency: transaction.currency,
          paymentMethod: transaction.paymentMethod?.type
        }
      );

      // Track feature usage for payment method
      if (transaction.paymentMethod) {
        analytics.trackFeatureUsage('payment_methods', 'successful_payment', {
          user_id: transaction.userId,
          payment_method_id: transaction.paymentMethod.id,
          payment_method_type: transaction.paymentMethod.type,
          provider: transaction.paymentMethod.provider,
          amount: Number(transaction.amount)
        });
      }

      console.log(`Payment completion tracked for transaction: ${transaction.id}`);
    }

    // Track performance metric
    monitoring.trackPerformanceMetric('payment_webhook_processing', Date.now() - startTime, {
      success: true,
      payment_intent_id: paymentIntent.id,
      transactions_count: transactions.length
    });

    console.log('Payment intent transaction updated:', paymentIntent.id)

  } catch (error) {
    const duration = Date.now() - startTime;

    // Track webhook processing error
    analytics.track('Payment Webhook Error', {
      reason: 'processing_error',
      payment_intent_id: paymentIntent.id,
      error_message: (error as Error).message,
      webhook_type: 'payment_intent.succeeded'
    });

    // Capture exception in monitoring
    monitoring.captureException(error as Error, {
      extra: {
        context: 'payment_webhook_processing',
        payment_intent_id: paymentIntent.id,
        webhook_type: 'payment_intent.succeeded',
        duration
      },
      tags: {
        endpoint: '/api/payments/stripe/webhook',
        operation: 'payment_intent_succeeded'
      }
    });

    console.error('Error handling payment intent succeeded:', error)
  }
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  const startTime = Date.now();
  
  try {
    console.log('Processing payment intent failed:', paymentIntent.id)

    // Find transactions with this payment intent
    const transactions = await prisma.transaction.findMany({
      where: {
        metadata: {
          path: ['stripePaymentIntentId'],
          equals: paymentIntent.id,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        },
        paymentMethod: {
          select: {
            id: true,
            type: true,
            provider: true
          }
        }
      }
    })

    // Update transactions with this payment intent
    await prisma.transaction.updateMany({
      where: {
        metadata: {
          path: ['stripePaymentIntentId'],
          equals: paymentIntent.id,
        },
      },
      data: {
        status: 'failed',
        metadata: {
          path: ['errorMessage'],
          equals: paymentIntent.last_payment_error?.message || 'Payment failed',
        },
      },
    })

    // Track payment failure for each transaction
    for (const transaction of transactions) {
      const failureData = {
        user_id: transaction.userId,
        transaction_id: transaction.id,
        payment_intent_id: paymentIntent.id,
        amount: Number(transaction.amount),
        currency: transaction.currency,
        payment_method: paymentIntent.payment_method?.toString() || 'unknown',
        payment_method_type: transaction.paymentMethod?.type || 'unknown',
        error_code: paymentIntent.last_payment_error?.code || 'unknown',
        error_message: paymentIntent.last_payment_error?.message || 'Payment failed',
        failure_timestamp: new Date().toISOString()
      };

      // Track payment failure event
      analytics.track(EVENTS.PAYMENT_FAILED, {
        ...failureData,
        revenue: 0 // No revenue from failed payments
      });

      // Track failed payment
      analytics.trackPayment(
        Number(transaction.amount),
        transaction.currency,
        transaction.paymentMethod?.type || 'stripe',
        false,
        {
          transaction_id: transaction.id,
          payment_intent_id: paymentIntent.id,
          payment_method_id: transaction.paymentMethodId,
          error_code: paymentIntent.last_payment_error?.code,
          error_message: paymentIntent.last_payment_error?.message,
          failure_timestamp: new Date().toISOString()
        }
      );

      // Add payment failure breadcrumb
      monitoring.addBreadcrumb(
        `Payment failed: ${paymentIntent.id}`,
        'payment',
        'error',
        {
          userId: transaction.userId,
          transactionId: transaction.id,
          paymentIntentId: paymentIntent.id,
          amount: Number(transaction.amount),
          currency: transaction.currency,
          errorCode: paymentIntent.last_payment_error?.code,
          errorMessage: paymentIntent.last_payment_error?.message
        }
      );

      // Capture payment failure as a message (not an exception since it's expected behavior)
      monitoring.captureMessage(
        `Payment failed: ${paymentIntent.last_payment_error?.message || 'Unknown error'}`,
        'warning',
        {
          extra: {
            user_id: transaction.userId,
            transaction_id: transaction.id,
            payment_intent_id: paymentIntent.id,
            amount: Number(transaction.amount),
            currency: transaction.currency,
            error_code: paymentIntent.last_payment_error?.code,
            error_type: paymentIntent.last_payment_error?.type,
            decline_code: paymentIntent.last_payment_error?.decline_code
          },
          tags: {
            payment_failure: true,
            error_code: paymentIntent.last_payment_error?.code || 'unknown'
          }
        }
      );

      console.log(`Payment failure tracked for transaction: ${transaction.id}`);
    }

    // Track performance metric
    monitoring.trackPerformanceMetric('payment_failure_webhook_processing', Date.now() - startTime, {
      success: true,
      payment_intent_id: paymentIntent.id,
      transactions_count: transactions.length
    });

    console.log('Failed payment intent transaction updated:', paymentIntent.id)

  } catch (error) {
    const duration = Date.now() - startTime;

    // Track webhook processing error
    analytics.track('Payment Webhook Error', {
      reason: 'processing_error',
      payment_intent_id: paymentIntent.id,
      error_message: (error as Error).message,
      webhook_type: 'payment_intent.payment_failed'
    });

    // Capture exception in monitoring
    monitoring.captureException(error as Error, {
      extra: {
        context: 'payment_failure_webhook_processing',
        payment_intent_id: paymentIntent.id,
        webhook_type: 'payment_intent.payment_failed',
        duration
      },
      tags: {
        endpoint: '/api/payments/stripe/webhook',
        operation: 'payment_intent_failed'
      }
    });

    console.error('Error handling payment intent failed:', error)
  }
}

async function handlePaymentMethodAttached(paymentMethod: Stripe.PaymentMethod) {
  try {
    console.log('Processing payment method attached:', paymentMethod.id)

    if (!paymentMethod.customer) {
      return
    }

    // Find user by customer ID
    const customer = await stripe.customers.retrieve(paymentMethod.customer as string)
    if (!customer || customer.deleted) {
      return
    }

    const userId = (customer as Stripe.Customer).metadata?.userId
    if (!userId) {
      return
    }

    await savePaymentMethod(userId, paymentMethod.id, paymentMethod.customer as string)

  } catch (error) {
    console.error('Error handling payment method attached:', error)
  }
}

async function handleCustomerCreated(customer: Stripe.Customer) {
  try {
    console.log('Processing customer created:', customer.id)

    // Update user record with customer ID if needed
    if (customer.metadata?.userId) {
      // Could store customer ID in user metadata or separate field
      console.log('Customer created for user:', customer.metadata.userId)
    }

  } catch (error) {
    console.error('Error handling customer created:', error)
  }
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  try {
    console.log('Processing invoice payment succeeded:', invoice.id)
    
    // Handle subscription or recurring payment success
    // This could update subscription status, etc.

  } catch (error) {
    console.error('Error handling invoice payment succeeded:', error)
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  try {
    console.log('Processing invoice payment failed:', invoice.id)
    
    // Handle subscription payment failure
    // This could notify user, update subscription status, etc.

  } catch (error) {
    console.error('Error handling invoice payment failed:', error)
  }
}

async function savePaymentMethod(userId: string, paymentMethodId: string, customerId: string) {
  try {
    // Retrieve payment method details from Stripe
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId)

    // Check if payment method already exists
    const existingPaymentMethod = await prisma.paymentMethod.findFirst({
      where: {
        userId,
        details: {
          path: ['stripePaymentMethodId'],
          equals: paymentMethodId,
        },
      },
    })

    if (existingPaymentMethod) {
      return existingPaymentMethod
    }

    // Create payment method record
    const paymentMethodRecord = await prisma.paymentMethod.create({
      data: {
        userId,
        type: paymentMethod.type,
        provider: 'stripe',
        details: {
          stripePaymentMethodId: paymentMethodId,
          stripeCustomerId: customerId,
          type: paymentMethod.type,
          ...(paymentMethod.card && {
            card: {
              brand: paymentMethod.card.brand,
              last4: paymentMethod.card.last4,
              expMonth: paymentMethod.card.exp_month,
              expYear: paymentMethod.card.exp_year,
            },
          }),
        },
      },
    })

    console.log('Payment method saved:', paymentMethodRecord.id)
    return paymentMethodRecord

  } catch (error) {
    console.error('Error saving payment method:', error)
  }
}

// Apply security middleware and export
export const POST = webhookSecurity(webhookHandler)