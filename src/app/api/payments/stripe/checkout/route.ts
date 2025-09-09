import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth-middleware'
import Stripe from 'stripe'
import { z } from 'zod'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

const checkoutSessionSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().length(3).optional().default('USD'),
  description: z.string().optional(),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
  paymentMethodTypes: z.array(z.string()).optional().default(['card']),
  mode: z.enum(['payment', 'setup', 'subscription']).optional().default('payment'),
  metadata: z.record(z.string()).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth.error) return auth.error

    const body = await request.json()
    const { 
      amount, 
      currency, 
      description, 
      successUrl, 
      cancelUrl, 
      paymentMethodTypes,
      mode,
      metadata 
    } = checkoutSessionSchema.parse(body)

    // Get or create Stripe customer
    let stripeCustomer = null
    const user = await prisma.user.findUnique({
      where: { id: auth.user.userId },
    })

    if (!user) {
      return createErrorResponse('User not found', 404)
    }

    // Check if user already has a Stripe customer ID
    const existingCustomer = await stripe.customers.list({
      email: user.email,
      limit: 1,
    })

    if (existingCustomer.data.length > 0) {
      stripeCustomer = existingCustomer.data[0]
    } else {
      // Create new Stripe customer
      stripeCustomer = await stripe.customers.create({
        email: user.email,
        name: user.name || undefined,
        metadata: {
          userId: auth.user.userId,
        },
      })
    }

    // Convert amount to cents for Stripe
    const amountInCents = Math.round(amount * 100)

    // Create checkout session parameters
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: stripeCustomer.id,
      mode,
      payment_method_types: paymentMethodTypes as any,
      success_url: successUrl || `${process.env.NEXT_PUBLIC_BASE_URL}/payments/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_BASE_URL}/payments/cancel`,
      metadata: {
        userId: auth.user.userId,
        ...metadata,
      },
    }

    if (mode === 'payment') {
      sessionParams.line_items = [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: description || 'FacePay Payment',
              description: `Payment processed through FacePay for ${user.email}`,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ]
    }

    // Create the checkout session
    const session = await stripe.checkout.sessions.create(sessionParams)

    // Create a pending transaction record
    const transaction = await prisma.transaction.create({
      data: {
        userId: auth.user.userId,
        amount: amount,
        currency: currency.toUpperCase(),
        status: 'pending',
        paymentMethodId: 'stripe-checkout',
        description: description || 'Stripe checkout payment',
        metadata: {
          stripeSessionId: session.id,
          stripeCustomerId: stripeCustomer.id,
          mode,
          ...metadata,
        },
      },
    })

    return createSuccessResponse({
      sessionId: session.id,
      sessionUrl: session.url,
      transactionId: transaction.id,
      customerId: stripeCustomer.id,
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse(error.errors[0].message, 400)
    }
    
    console.error('Checkout session creation error:', error)
    return createErrorResponse('Failed to create checkout session', 500)
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth.error) return auth.error

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('session_id')

    if (!sessionId) {
      return createErrorResponse('Session ID is required', 400)
    }

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent', 'customer'],
    })

    // Verify the session belongs to the authenticated user
    const transaction = await prisma.transaction.findFirst({
      where: {
        userId: auth.user.userId,
        metadata: {
          path: ['stripeSessionId'],
          equals: sessionId,
        },
      },
    })

    if (!transaction) {
      return createErrorResponse('Transaction not found', 404)
    }

    return createSuccessResponse({
      sessionId: session.id,
      paymentStatus: session.payment_status,
      customerEmail: session.customer_details?.email,
      amountTotal: session.amount_total,
      currency: session.currency,
      paymentIntent: session.payment_intent,
      transactionId: transaction.id,
    })

  } catch (error) {
    console.error('Checkout session retrieval error:', error)
    return createErrorResponse('Failed to retrieve checkout session', 500)
  }
}