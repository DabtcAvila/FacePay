import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth-middleware'
import { z } from 'zod'

const refundRequestSchema = z.object({
  amount: z.number().positive('Refund amount must be positive').optional(),
  reason: z.string().min(1, 'Refund reason is required'),
  metadata: z.record(z.string()).optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth(request)
    if (auth.error) return auth.error

    const body = await request.json()
    const { amount, reason, metadata } = refundRequestSchema.parse(body)

    // Find the transaction
    const transaction = await prisma.transaction.findFirst({
      where: {
        id: params.id,
        userId: auth.user.userId,
      },
      include: {
        paymentMethod: true,
      },
    })

    if (!transaction) {
      return createErrorResponse('Transaction not found', 404)
    }

    // Check if already refunded
    if (transaction.status === 'refunded') {
      return createErrorResponse('Transaction already refunded', 400)
    }

    // Only completed transactions can be refunded
    if (transaction.status !== 'completed') {
      return createErrorResponse('Only completed transactions can be refunded', 400)
    }

    // Validate refund amount (default to full amount if not specified)
    const refundAmount = amount || transaction.amount
    if (refundAmount > transaction.amount) {
      return createErrorResponse('Refund amount cannot exceed transaction amount', 400)
    }

    // Create refund record in metadata
    const refundData = {
      refundAmount,
      reason,
      refundedAt: new Date().toISOString(),
      refundedBy: auth.user.userId,
      originalAmount: transaction.amount,
      ...(metadata && { additionalMetadata: metadata }),
    }

    // Update transaction status and add refund information
    const updatedTransaction = await prisma.transaction.update({
      where: {
        id: params.id,
      },
      data: {
        status: 'refunded',
        metadata: {
          ...(transaction.metadata as Record<string, any> || {}),
          refund: refundData,
        },
      },
      include: {
        paymentMethod: {
          select: {
            id: true,
            type: true,
            provider: true,
            details: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    })

    // In a real implementation, you would integrate with payment processors here
    // For example, Stripe refunds, bank transfer reversals, etc.
    
    return createSuccessResponse({
      transaction: updatedTransaction,
      refund: {
        id: `refund_${params.id}_${Date.now()}`,
        amount: refundAmount,
        reason,
        status: 'processed',
        processedAt: new Date().toISOString(),
      },
    }, 'Refund processed successfully')

  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse(error.errors[0].message, 400)
    }
    
    console.error('Process refund error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth(request)
    if (auth.error) return auth.error

    const transaction = await prisma.transaction.findFirst({
      where: {
        id: params.id,
        userId: auth.user.userId,
      },
    })

    if (!transaction) {
      return createErrorResponse('Transaction not found', 404)
    }

    const metadata = transaction.metadata as Record<string, any> || {}
    const refundInfo = metadata.refund

    if (!refundInfo) {
      return createErrorResponse('No refund information found for this transaction', 404)
    }

    return createSuccessResponse({
      transactionId: transaction.id,
      refund: {
        id: `refund_${params.id}_${new Date(refundInfo.refundedAt).getTime()}`,
        amount: refundInfo.refundAmount,
        reason: refundInfo.reason,
        status: transaction.status === 'refunded' ? 'processed' : 'pending',
        processedAt: refundInfo.refundedAt,
        originalAmount: refundInfo.originalAmount,
        additionalMetadata: refundInfo.additionalMetadata,
      },
    })

  } catch (error) {
    console.error('Get refund info error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}
// Prevent static generation
export const dynamic = 'force-dynamic'
