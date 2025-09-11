import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth-middleware'
import Stripe from 'stripe'
import { z } from 'zod'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

const setupIntentSchema = z.object({
  paymentMethodTypes: z.array(z.string()).optional().default(['card']),
})

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth.error) return auth.error

    const body = await request.json()
    const { paymentMethodTypes } = setupIntentSchema.parse(body)

    // Create setup intent for adding payment method
    const setupIntent = await stripe.setupIntents.create({
      customer: auth.user.userId, // In production, use Stripe customer ID
      payment_method_types: paymentMethodTypes,
      usage: 'off_session',
      metadata: {
        userId: auth.user.userId,
      },
    })

    return createSuccessResponse({
      clientSecret: setupIntent.client_secret,
      setupIntentId: setupIntent.id,
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse(error.errors[0].message, 400)
    }
    
    console.error('Setup intent error:', error)
    return createErrorResponse('Failed to create setup intent', 500)
  }
}
// Prevent static generation
export const dynamic = 'force-dynamic'
