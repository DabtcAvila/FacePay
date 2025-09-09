import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth-middleware'
import Stripe from 'stripe'
import { z } from 'zod'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

const paymentIntentSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().length(3).optional().default('USD'),
  paymentMethodId: z.string().optional(),
  description: z.string().optional(),
  metadata: z.record(z.string()).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth.error) return auth.error

    const body = await request.json()
    const { amount, currency, paymentMethodId, description, metadata } = paymentIntentSchema.parse(body)

    // Convert amount to cents (Stripe expects amounts in smallest currency unit)
    const amountInCents = Math.round(amount * 100)

    // Create payment intent
    const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
      amount: amountInCents,
      currency: currency.toLowerCase(),
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
        currency: currency.toUpperCase(),
        status: 'pending',
        paymentMethodId: paymentMethod?.id || 'stripe-temp',
        description: description || 'Stripe payment',
        metadata: {
          stripePaymentIntentId: paymentIntent.id,
          ...metadata,
        },
      },
    })

    return createSuccessResponse({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      transactionId: transaction.id,
      status: paymentIntent.status,
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse(error.errors[0].message, 400)
    }
    
    console.error('Payment intent error:', error)
    return createErrorResponse('Failed to create payment intent', 500)
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth.error) return auth.error

    const body = await request.json()
    const { paymentIntentId } = body

    if (!paymentIntentId) {
      return createErrorResponse('Payment intent ID is required', 400)
    }

    // Confirm payment intent
    const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId)

    // Update transaction status
    await prisma.transaction.updateMany({
      where: {
        userId: auth.user.userId,
        metadata: {
          path: ['stripePaymentIntentId'],
          equals: paymentIntentId,
        },
      },
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
    return createErrorResponse('Failed to confirm payment intent', 500)
  }
}