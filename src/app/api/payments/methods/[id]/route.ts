import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth-middleware'
import { z } from 'zod'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

const updatePaymentMethodSchema = z.object({
  isDefault: z.boolean().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth(request)
    if (auth.error) return auth.error

    const paymentMethod = await prisma.paymentMethod.findFirst({
      where: {
        id: params.id,
        userId: auth.user.userId,
      },
      select: {
        id: true,
        type: true,
        provider: true,
        details: true,
        isDefault: true,
        createdAt: true,
        _count: {
          select: {
            transactions: true,
          },
        },
      },
    })

    if (!paymentMethod) {
      return createErrorResponse('Payment method not found', 404)
    }

    // Enhance with Stripe details if applicable
    if (paymentMethod.provider === 'stripe' && paymentMethod.details && typeof paymentMethod.details === 'object' && 'stripePaymentMethodId' in paymentMethod.details) {
      try {
        const stripeMethod = await stripe.paymentMethods.retrieve(
          paymentMethod.details.stripePaymentMethodId as string
        )
        
        paymentMethod.details = {
          ...paymentMethod.details,
          last4: stripeMethod.card?.last4,
          brand: stripeMethod.card?.brand,
          expMonth: stripeMethod.card?.exp_month,
          expYear: stripeMethod.card?.exp_year,
        }
      } catch (error) {
        console.warn('Failed to fetch Stripe payment method details:', error)
      }
    }

    return createSuccessResponse(paymentMethod)

  } catch (error) {
    console.error('Get payment method error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth(request)
    if (auth.error) return auth.error

    const body = await request.json()
    const { isDefault } = updatePaymentMethodSchema.parse(body)

    // Verify payment method exists and belongs to user
    const existingMethod = await prisma.paymentMethod.findFirst({
      where: {
        id: params.id,
        userId: auth.user.userId,
      },
    })

    if (!existingMethod) {
      return createErrorResponse('Payment method not found', 404)
    }

    // If setting as default, unset other default payment methods
    if (isDefault) {
      await prisma.paymentMethod.updateMany({
        where: {
          userId: auth.user.userId,
          isDefault: true,
          NOT: {
            id: params.id,
          },
        },
        data: {
          isDefault: false,
        },
      })
    }

    const updatedMethod = await prisma.paymentMethod.update({
      where: {
        id: params.id,
      },
      data: {
        ...(isDefault !== undefined && { isDefault }),
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

    return createSuccessResponse(updatedMethod, 'Payment method updated successfully')

  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse(error.errors[0].message, 400)
    }
    
    console.error('Update payment method error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth(request)
    if (auth.error) return auth.error

    // Check if payment method exists and belongs to user
    const paymentMethod = await prisma.paymentMethod.findFirst({
      where: {
        id: params.id,
        userId: auth.user.userId,
      },
      include: {
        _count: {
          select: {
            transactions: true,
          },
        },
      },
    })

    if (!paymentMethod) {
      return createErrorResponse('Payment method not found', 404)
    }

    // Check if there are pending transactions with this payment method
    const pendingTransactions = await prisma.transaction.count({
      where: {
        paymentMethodId: params.id,
        status: 'pending',
      },
    })

    if (pendingTransactions > 0) {
      return createErrorResponse('Cannot delete payment method with pending transactions', 409)
    }

    // If this is a Stripe payment method, detach it from Stripe
    if (paymentMethod.provider === 'stripe' && paymentMethod.details && typeof paymentMethod.details === 'object' && 'stripePaymentMethodId' in paymentMethod.details) {
      try {
        await stripe.paymentMethods.detach(paymentMethod.details.stripePaymentMethodId as string)
      } catch (error) {
        console.warn('Failed to detach Stripe payment method:', error)
      }
    }

    await prisma.paymentMethod.delete({
      where: {
        id: params.id,
      },
    })

    return createSuccessResponse(null, 'Payment method deleted successfully')

  } catch (error) {
    console.error('Delete payment method error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}