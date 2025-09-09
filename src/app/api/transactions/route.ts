import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth-middleware'
import { z } from 'zod'

const createTransactionSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().length(3).optional().default('USD'),
  paymentMethodId: z.string().min(1, 'Payment method ID is required'),
  description: z.string().optional(),
  metadata: z.record(z.string()).optional(),
})

const querySchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('20'),
  status: z.enum(['pending', 'completed', 'failed', 'refunded']).optional(),
  sortBy: z.enum(['createdAt', 'amount', 'status']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
})

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth.error) return auth.error

    const url = new URL(request.url)
    const { page, limit, status, sortBy, sortOrder } = querySchema.parse({
      page: url.searchParams.get('page') || '1',
      limit: url.searchParams.get('limit') || '20',
      status: url.searchParams.get('status') || undefined,
      sortBy: url.searchParams.get('sortBy') || 'createdAt',
      sortOrder: url.searchParams.get('sortOrder') || 'desc',
    })

    const pageNum = parseInt(page)
    const limitNum = parseInt(limit)
    const offset = (pageNum - 1) * limitNum

    const where = {
      userId: auth.user.userId,
      ...(status && { status }),
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
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
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip: offset,
        take: limitNum,
      }),
      prisma.transaction.count({ where }),
    ])

    const totalPages = Math.ceil(total / limitNum)

    return createSuccessResponse({
      transactions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1,
      },
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse(error.errors[0].message, 400)
    }
    
    console.error('Get transactions error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth.error) return auth.error

    const body = await request.json()
    const { amount, currency, paymentMethodId, description, metadata } = createTransactionSchema.parse(body)

    // Verify payment method belongs to user
    const paymentMethod = await prisma.paymentMethod.findFirst({
      where: {
        id: paymentMethodId,
        userId: auth.user.userId,
      },
    })

    if (!paymentMethod) {
      return createErrorResponse('Payment method not found', 404)
    }

    const transaction = await prisma.transaction.create({
      data: {
        userId: auth.user.userId,
        amount,
        currency: currency.toUpperCase(),
        status: 'pending',
        paymentMethodId,
        description,
        metadata,
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

    return createSuccessResponse(transaction, 'Transaction created successfully')

  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse(error.errors[0].message, 400)
    }
    
    console.error('Create transaction error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}