import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth-middleware'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const historyQuerySchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('20'),
  status: z.enum(['pending', 'completed', 'failed', 'refunded']).optional(),
  paymentMethod: z.string().optional(), // Filter by payment method type
  dateFrom: z.string().optional(), // ISO date string
  dateTo: z.string().optional(), // ISO date string
  amountMin: z.string().optional(),
  amountMax: z.string().optional(),
  search: z.string().optional(), // Search in description
  sortBy: z.enum(['createdAt', 'completedAt', 'amount', 'status']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  includeAnalytics: z.string().optional().default('false'),
})

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth.error) return auth.error

    const url = new URL(request.url)
    const queryParams = Object.fromEntries(url.searchParams.entries())
    const {
      page,
      limit,
      status,
      paymentMethod,
      dateFrom,
      dateTo,
      amountMin,
      amountMax,
      search,
      sortBy,
      sortOrder,
      includeAnalytics,
    } = historyQuerySchema.parse(queryParams)

    const pageNum = parseInt(page)
    const limitNum = parseInt(limit)
    const offset = (pageNum - 1) * limitNum

    // Build where clause
    const where: any = {
      userId: auth.user.userId,
    }

    // Status filter
    if (status) {
      where.status = status
    }

    // Date range filter
    if (dateFrom || dateTo) {
      where.createdAt = {}
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom)
      }
      if (dateTo) {
        where.createdAt.lte = new Date(dateTo)
      }
    }

    // Amount range filter
    if (amountMin || amountMax) {
      where.amount = {}
      if (amountMin) {
        where.amount.gte = parseFloat(amountMin)
      }
      if (amountMax) {
        where.amount.lte = parseFloat(amountMax)
      }
    }

    // Search in description
    if (search) {
      where.description = {
        contains: search,
        mode: 'insensitive',
      }
    }

    // Payment method filter
    if (paymentMethod) {
      where.paymentMethod = {
        type: paymentMethod,
      }
    }

    // Execute queries
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

    const result: any = {
      transactions: transactions.map(transaction => ({
        ...transaction,
        // Add computed fields
        isRefunded: transaction.status === 'refunded',
        refundInfo: transaction.status === 'refunded' && transaction.metadata 
          ? (transaction.metadata as any).refund 
          : null,
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1,
      },
      filters: {
        status,
        paymentMethod,
        dateFrom,
        dateTo,
        amountMin,
        amountMax,
        search,
      },
    }

    // Add analytics if requested
    if (includeAnalytics === 'true') {
      const analytics = await generateAnalytics(auth.user.userId, where)
      result.analytics = analytics
    }

    return createSuccessResponse(result)

  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse(error.errors[0].message, 400)
    }
    
    console.error('Get transaction history error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

async function generateAnalytics(userId: string, baseWhere: any) {
  try {
    // Remove pagination-specific filters for analytics
    const analyticsWhere = { ...baseWhere }
    
    // Total transactions
    const totalTransactions = await prisma.transaction.count({
      where: analyticsWhere,
    })

    // Transaction by status
    const statusBreakdown = await prisma.transaction.groupBy({
      by: ['status'],
      where: analyticsWhere,
      _count: {
        id: true,
      },
      _sum: {
        amount: true,
      },
    })

    // Payment method breakdown
    const paymentMethodBreakdown = await prisma.transaction.groupBy({
      by: ['paymentMethodId'],
      where: analyticsWhere,
      _count: {
        id: true,
      },
      _sum: {
        amount: true,
      },
    })

    // Get payment method details
    const paymentMethods = await prisma.paymentMethod.findMany({
      where: {
        userId,
        id: {
          in: paymentMethodBreakdown.map(pm => pm.paymentMethodId),
        },
      },
      select: {
        id: true,
        type: true,
        provider: true,
      },
    })

    // Monthly breakdown (last 12 months)
    const twelveMonthsAgo = new Date()
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)

    const monthlyData = await prisma.transaction.findMany({
      where: {
        ...analyticsWhere,
        createdAt: {
          gte: twelveMonthsAgo,
        },
      },
      select: {
        amount: true,
        status: true,
        createdAt: true,
      },
    })

    // Process monthly data
    const monthlyBreakdown = monthlyData.reduce((acc, transaction) => {
      const monthYear = transaction.createdAt.toISOString().slice(0, 7) // YYYY-MM
      if (!acc[monthYear]) {
        acc[monthYear] = {
          total: 0,
          count: 0,
          completed: 0,
          refunded: 0,
        }
      }
      acc[monthYear].total += transaction.amount
      acc[monthYear].count += 1
      if (transaction.status === 'completed') {
        acc[monthYear].completed += transaction.amount
      } else if (transaction.status === 'refunded') {
        acc[monthYear].refunded += transaction.amount
      }
      return acc
    }, {} as Record<string, any>)

    // Calculate totals
    const totalAmount = statusBreakdown.reduce((sum, item) => sum + Number(item._sum.amount || 0), 0)
    const completedAmount = statusBreakdown.find(item => item.status === 'completed')?._sum.amount || 0
    const refundedAmount = statusBreakdown.find(item => item.status === 'refunded')?._sum.amount || 0

    return {
      summary: {
        totalTransactions,
        totalAmount,
        completedAmount: Number(completedAmount || 0),
        refundedAmount: Number(refundedAmount || 0),
        netAmount: Number(completedAmount || 0) - Number(refundedAmount || 0),
      },
      statusBreakdown: statusBreakdown.map(item => ({
        status: item.status,
        count: item._count.id,
        totalAmount: Number(item._sum.amount || 0),
      })),
      paymentMethodBreakdown: paymentMethodBreakdown.map(item => {
        const method = paymentMethods.find(pm => pm.id === item.paymentMethodId)
        return {
          paymentMethodId: item.paymentMethodId,
          type: method?.type || 'unknown',
          provider: method?.provider || 'unknown',
          count: item._count.id,
          totalAmount: Number(item._sum.amount || 0),
        }
      }),
      monthlyBreakdown: Object.entries(monthlyBreakdown)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, data]) => ({
          month,
          ...data,
        })),
      trends: {
        averageTransactionAmount: totalAmount / totalTransactions || 0,
        refundRate: (statusBreakdown.find(item => item.status === 'refunded')?._count.id || 0) / totalTransactions * 100,
        completionRate: (statusBreakdown.find(item => item.status === 'completed')?._count.id || 0) / totalTransactions * 100,
      },
    }
  } catch (error) {
    console.error('Analytics generation error:', error)
    return null
  }
}