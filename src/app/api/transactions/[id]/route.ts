import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth-middleware'
import { z } from 'zod'

const updateTransactionSchema = z.object({
  status: z.enum(['pending', 'completed', 'failed', 'refunded']).optional(),
  description: z.string().optional(),
  metadata: z.record(z.string()).optional(),
})

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

    if (!transaction) {
      return createErrorResponse('Transaction not found', 404)
    }

    return createSuccessResponse(transaction)

  } catch (error) {
    console.error('Get transaction error:', error)
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
    const { status, description, metadata } = updateTransactionSchema.parse(body)

    // Verify transaction exists and belongs to user
    const existingTransaction = await prisma.transaction.findFirst({
      where: {
        id: params.id,
        userId: auth.user.userId,
      },
    })

    if (!existingTransaction) {
      return createErrorResponse('Transaction not found', 404)
    }

    // Only allow certain status transitions
    if (status) {
      const allowedTransitions: Record<string, string[]> = {
        pending: ['completed', 'failed'],
        completed: ['refunded'],
        failed: ['pending'], // Allow retry
        refunded: [], // Final state
      }

      const currentStatus = existingTransaction.status
      if (!allowedTransitions[currentStatus]?.includes(status)) {
        return createErrorResponse(`Cannot transition from ${currentStatus} to ${status}`, 400)
      }
    }

    const updatedTransaction = await prisma.transaction.update({
      where: {
        id: params.id,
      },
      data: {
        ...(status && { 
          status,
          ...(status === 'completed' && { completedAt: new Date() }),
        }),
        ...(description !== undefined && { description }),
        ...(metadata && { metadata: { ...(existingTransaction.metadata as Record<string, any> || {}), ...metadata } }),
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
      },
    })

    return createSuccessResponse(updatedTransaction, 'Transaction updated successfully')

  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse(error.errors[0].message, 400)
    }
    
    console.error('Update transaction error:', error)
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

    // Check if transaction exists and belongs to user
    const transaction = await prisma.transaction.findFirst({
      where: {
        id: params.id,
        userId: auth.user.userId,
      },
    })

    if (!transaction) {
      return createErrorResponse('Transaction not found', 404)
    }

    // Only allow deletion of pending or failed transactions
    if (!['pending', 'failed'].includes(transaction.status)) {
      return createErrorResponse('Cannot delete completed or refunded transactions', 400)
    }

    await prisma.transaction.delete({
      where: {
        id: params.id,
      },
    })

    return createSuccessResponse(null, 'Transaction deleted successfully')

  } catch (error) {
    console.error('Delete transaction error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}