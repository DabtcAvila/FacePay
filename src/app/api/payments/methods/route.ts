import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth-middleware'
import { z } from 'zod'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

const addPaymentMethodSchema = z.object({
  type: z.enum(['card', 'bank', 'crypto']),
  provider: z.enum(['stripe', 'ethereum', 'bitcoin']),
  stripePaymentMethodId: z.string().optional(),
  walletAddress: z.string().optional(),
  network: z.string().optional(),
  isDefault: z.boolean().optional().default(false),
})

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth.error) return auth.error

    const paymentMethods = await prisma.paymentMethod.findMany({
      where: { userId: auth.user.userId },
      select: {
        id: true,
        type: true,
        provider: true,
        details: true,
        isDefault: true,
        createdAt: true,
      },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' },
      ],
    })

    // Enhance Stripe payment methods with additional details
    const enhancedMethods = await Promise.all(
      paymentMethods.map(async (method) => {
        if (method.provider === 'stripe' && method.details && typeof method.details === 'object' && 'stripePaymentMethodId' in method.details) {
          try {
            const stripeMethod = await stripe.paymentMethods.retrieve(
              method.details.stripePaymentMethodId as string
            )
            
            return {
              ...method,
              details: {
                ...method.details,
                last4: stripeMethod.card?.last4,
                brand: stripeMethod.card?.brand,
                expMonth: stripeMethod.card?.exp_month,
                expYear: stripeMethod.card?.exp_year,
              },
            }
          } catch (error) {
            console.warn('Failed to fetch Stripe payment method details:', error)
            return method
          }
        }
        return method
      })
    )

    return createSuccessResponse(enhancedMethods)

  } catch (error) {
    console.error('Get payment methods error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth.error) return auth.error

    const body = await request.json()
    const { type, provider, stripePaymentMethodId, walletAddress, network, isDefault } = addPaymentMethodSchema.parse(body)

    // If this is set as default, unset other default payment methods
    if (isDefault) {
      await prisma.paymentMethod.updateMany({
        where: {
          userId: auth.user.userId,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      })
    }

    // Prepare details based on provider
    let details: any = {}
    
    if (provider === 'stripe' && stripePaymentMethodId) {
      // Verify the payment method exists and belongs to the user
      try {
        const stripeMethod = await stripe.paymentMethods.retrieve(stripePaymentMethodId)
        details = {
          stripePaymentMethodId,
          last4: stripeMethod.card?.last4,
          brand: stripeMethod.card?.brand,
        }
      } catch (error) {
        return createErrorResponse('Invalid Stripe payment method', 400)
      }
    } else if (provider === 'ethereum' && walletAddress) {
      details = {
        walletAddress,
        network: network || 'mainnet',
      }
    } else if (provider === 'bitcoin' && walletAddress) {
      details = {
        walletAddress,
        network: network || 'mainnet',
      }
    }

    const paymentMethod = await prisma.paymentMethod.create({
      data: {
        userId: auth.user.userId,
        type,
        provider,
        details,
        isDefault,
      },
      select: {
        id: true,
        type: true,
        provider: true,
        details: true,
        isDefault: true,
        createdAt: true,
      },
    })

    return createSuccessResponse(paymentMethod, 'Payment method added successfully')

  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse(error.errors[0].message, 400)
    }
    
    console.error('Add payment method error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}