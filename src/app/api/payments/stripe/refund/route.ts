import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth-middleware'
import Stripe from 'stripe'
import { z } from 'zod'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

const refundSchema = z.object({
  paymentIntentId: z.string(),
  amount: z.number().positive().optional(),
  reason: z.enum(['duplicate', 'fraudulent', 'requested_by_customer']).optional(),
  metadata: z.record(z.string()).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth.error) return auth.error

    const body = await request.json()
    const { paymentIntentId, amount, reason, metadata } = refundSchema.parse(body)

    // Find the transaction
    const transaction = await prisma.transaction.findFirst({
      where: {
        userId: auth.user.userId,
        metadata: {
          path: ['stripePaymentIntentId'],
          equals: paymentIntentId,
        },
        status: 'completed',
      },
    })

    if (!transaction) {
      return createErrorResponse('Transaction not found or cannot be refunded', 404)
    }

    // Create refund parameters
    const refundParams: Stripe.RefundCreateParams = {
      payment_intent: paymentIntentId,
      metadata: {
        userId: auth.user.userId,
        transactionId: transaction.id,
        ...metadata,
      },
    }

    if (amount) {
      refundParams.amount = Math.round(amount * 100) // Convert to cents
    }

    if (reason) {
      refundParams.reason = reason
    }

    // Create the refund
    const refund = await stripe.refunds.create(refundParams)

    // Update transaction status
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: 'refunded',
        metadata: {
          ...transaction.metadata as object,
          refundId: refund.id,
          refundAmount: refund.amount,
          refundReason: refund.reason,
          refundedAt: new Date().toISOString(),
        },
      },
    })

    return createSuccessResponse({
      refundId: refund.id,
      amount: refund.amount / 100, // Convert back to dollars
      currency: refund.currency,
      status: refund.status,
      reason: refund.reason,
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse(error.errors[0].message, 400)
    }
    
    console.error('Refund creation error:', error)
    return createErrorResponse('Failed to create refund', 500)
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth.error) return auth.error

    const { searchParams } = new URL(request.url)
    const paymentIntentId = searchParams.get('payment_intent_id')

    if (!paymentIntentId) {
      return createErrorResponse('Payment intent ID is required', 400)
    }

    // Verify the payment intent belongs to the user
    const transaction = await prisma.transaction.findFirst({
      where: {
        userId: auth.user.userId,
        metadata: {
          path: ['stripePaymentIntentId'],
          equals: paymentIntentId,
        },
      },
    })

    if (!transaction) {
      return createErrorResponse('Transaction not found', 404)
    }

    // List refunds for the payment intent
    const refunds = await stripe.refunds.list({
      payment_intent: paymentIntentId,
    })

    return createSuccessResponse({
      refunds: refunds.data.map(refund => ({
        id: refund.id,
        amount: refund.amount / 100, // Convert to dollars
        currency: refund.currency,
        status: refund.status,
        reason: refund.reason,
        created: refund.created,
      })),
    })

  } catch (error) {
    console.error('Refund retrieval error:', error)
    return createErrorResponse('Failed to retrieve refunds', 500)
  }
}
// Prevent static generation
export const dynamic = 'force-dynamic'
