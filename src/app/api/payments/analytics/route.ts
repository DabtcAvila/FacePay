import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth-middleware'
import { z } from 'zod'

// Force this route to be dynamic
export const dynamic = 'force-dynamic'

const analyticsQuerySchema = z.object({
  period: z.enum(['7d', '30d', '90d', '1y', 'all']).optional().default('30d'),
  granularity: z.enum(['day', 'week', 'month']).optional().default('day'),
  timezone: z.string().optional().default('UTC'),
  includeRefunds: z.string().optional().default('true'),
  currency: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth.error) return auth.error

    const url = new URL(request.url)
    const queryParams = Object.fromEntries(url.searchParams.entries())
    const { period, granularity, timezone, includeRefunds, currency } = analyticsQuerySchema.parse(queryParams)

    // Calculate date range
    const endDate = new Date()
    const startDate = getStartDate(period, endDate)

    // Build base where clause
    const baseWhere = {
      userId: auth.user.userId,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
      ...(currency && { currency: currency.toUpperCase() }),
    }

    // Generate comprehensive analytics
    const [
      overview,
      timeSeriesData,
      paymentMethodAnalytics,
      statusAnalytics,
      topTransactions,
      failureAnalytics,
    ] = await Promise.all([
      generateOverview(baseWhere, includeRefunds === 'true'),
      generateTimeSeries(baseWhere, granularity, startDate, endDate),
      generatePaymentMethodAnalytics(baseWhere),
      generateStatusAnalytics(baseWhere),
      getTopTransactions(baseWhere, 10),
      generateFailureAnalytics(baseWhere),
    ])

    const result = {
      period,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      overview,
      timeSeries: timeSeriesData,
      paymentMethods: paymentMethodAnalytics,
      status: statusAnalytics,
      topTransactions,
      failures: failureAnalytics,
      generated: new Date().toISOString(),
    }

    return createSuccessResponse(result)

  } catch (error) {
    if (error instanceof z.ZodError) {
      return createErrorResponse(error.errors[0].message, 400)
    }
    
    console.error('Payment analytics error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

function getStartDate(period: string, endDate: Date): Date {
  const start = new Date(endDate)
  
  switch (period) {
    case '7d':
      start.setDate(start.getDate() - 7)
      break
    case '30d':
      start.setDate(start.getDate() - 30)
      break
    case '90d':
      start.setDate(start.getDate() - 90)
      break
    case '1y':
      start.setFullYear(start.getFullYear() - 1)
      break
    case 'all':
      start.setFullYear(2020) // Set to a very early date
      break
  }
  
  return start
}

async function generateOverview(baseWhere: any, includeRefunds: boolean) {
  const transactions = await prisma.transaction.findMany({
    where: baseWhere,
    select: {
      amount: true,
      status: true,
      currency: true,
      metadata: true,
    },
  })

  const stats = transactions.reduce((acc, transaction) => {
    const metadata = transaction.metadata as any
    const isRefunded = transaction.status === 'refunded'
    const refundAmount = isRefunded && metadata?.refund ? metadata.refund.refundAmount : 0

    acc.totalTransactions += 1
    acc.totalAmount += Number(transaction.amount)

    switch (transaction.status) {
      case 'completed':
        acc.completedTransactions += 1
        acc.completedAmount += Number(transaction.amount)
        break
      case 'pending':
        acc.pendingTransactions += 1
        acc.pendingAmount += Number(transaction.amount)
        break
      case 'failed':
        acc.failedTransactions += 1
        break
      case 'refunded':
        acc.refundedTransactions += 1
        acc.refundedAmount += refundAmount || Number(transaction.amount)
        if (includeRefunds) {
          acc.netAmount -= (refundAmount || Number(transaction.amount))
        }
        break
    }

    return acc
  }, {
    totalTransactions: 0,
    totalAmount: 0,
    completedTransactions: 0,
    completedAmount: 0,
    pendingTransactions: 0,
    pendingAmount: 0,
    failedTransactions: 0,
    refundedTransactions: 0,
    refundedAmount: 0,
    netAmount: 0,
  })

  // Calculate net amount
  stats.netAmount = stats.completedAmount - (includeRefunds ? stats.refundedAmount : 0)

  // Calculate rates
  const completionRate = stats.totalTransactions > 0 ? (stats.completedTransactions / stats.totalTransactions) * 100 : 0
  const failureRate = stats.totalTransactions > 0 ? (stats.failedTransactions / stats.totalTransactions) * 100 : 0
  const refundRate = stats.totalTransactions > 0 ? (stats.refundedTransactions / stats.totalTransactions) * 100 : 0
  const averageTransactionAmount = stats.totalTransactions > 0 ? stats.totalAmount / stats.totalTransactions : 0

  return {
    ...stats,
    metrics: {
      completionRate: Math.round(completionRate * 100) / 100,
      failureRate: Math.round(failureRate * 100) / 100,
      refundRate: Math.round(refundRate * 100) / 100,
      averageTransactionAmount: Math.round(averageTransactionAmount * 100) / 100,
    },
  }
}

async function generateTimeSeries(baseWhere: any, granularity: string, startDate: Date, endDate: Date) {
  const transactions = await prisma.transaction.findMany({
    where: baseWhere,
    select: {
      amount: true,
      status: true,
      createdAt: true,
      completedAt: true,
      metadata: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  })

  const timePoints = generateTimePoints(startDate, endDate, granularity)
  
  const seriesData = timePoints.map(point => {
    const pointTransactions = transactions.filter(t => {
      const transactionDate = new Date(t.createdAt)
      return transactionDate >= point.start && transactionDate < point.end
    })

    const stats = pointTransactions.reduce((acc, t) => {
      const metadata = t.metadata as any
      const refundAmount = t.status === 'refunded' && metadata?.refund ? metadata.refund.refundAmount : 0

      acc.total += 1
      acc.totalAmount += Number(t.amount)

      switch (t.status) {
        case 'completed':
          acc.completed += 1
          acc.completedAmount += Number(t.amount)
          break
        case 'pending':
          acc.pending += 1
          break
        case 'failed':
          acc.failed += 1
          break
        case 'refunded':
          acc.refunded += 1
          acc.refundedAmount += refundAmount || Number(t.amount)
          break
      }

      return acc
    }, {
      total: 0,
      totalAmount: 0,
      completed: 0,
      completedAmount: 0,
      pending: 0,
      failed: 0,
      refunded: 0,
      refundedAmount: 0,
    })

    return {
      date: point.label,
      timestamp: point.start.toISOString(),
      ...stats,
      netAmount: stats.completedAmount - stats.refundedAmount,
    }
  })

  return seriesData
}

function generateTimePoints(startDate: Date, endDate: Date, granularity: string) {
  const points = []
  const current = new Date(startDate)
  
  while (current < endDate) {
    const pointStart = new Date(current)
    const pointEnd = new Date(current)
    
    switch (granularity) {
      case 'day':
        pointEnd.setDate(pointEnd.getDate() + 1)
        break
      case 'week':
        pointEnd.setDate(pointEnd.getDate() + 7)
        break
      case 'month':
        pointEnd.setMonth(pointEnd.getMonth() + 1)
        break
    }
    
    points.push({
      start: pointStart,
      end: pointEnd > endDate ? endDate : pointEnd,
      label: formatDateLabel(pointStart, granularity),
    })
    
    current.setTime(pointEnd.getTime())
  }
  
  return points
}

function formatDateLabel(date: Date, granularity: string): string {
  switch (granularity) {
    case 'day':
      return date.toISOString().split('T')[0]
    case 'week':
      const weekStart = new Date(date)
      weekStart.setDate(date.getDate() - date.getDay())
      return `${weekStart.toISOString().split('T')[0]} (Week)`
    case 'month':
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    default:
      return date.toISOString().split('T')[0]
  }
}

async function generatePaymentMethodAnalytics(baseWhere: any) {
  const data = await prisma.transaction.groupBy({
    by: ['paymentMethodId'],
    where: baseWhere,
    _count: {
      id: true,
    },
    _sum: {
      amount: true,
    },
    _avg: {
      amount: true,
    },
  })

  // Get payment method details
  const paymentMethods = await prisma.paymentMethod.findMany({
    where: {
      id: {
        in: data.map(d => d.paymentMethodId),
      },
    },
    select: {
      id: true,
      type: true,
      provider: true,
    },
  })

  return data.map(item => {
    const method = paymentMethods.find(pm => pm.id === item.paymentMethodId)
    return {
      paymentMethodId: item.paymentMethodId,
      type: method?.type || 'unknown',
      provider: method?.provider || 'unknown',
      transactionCount: item._count.id,
      totalAmount: item._sum.amount || 0,
      averageAmount: Math.round((Number(item._avg.amount) || 0) * 100) / 100,
    }
  }).sort((a, b) => Number(b.totalAmount) - Number(a.totalAmount))
}

async function generateStatusAnalytics(baseWhere: any) {
  return await prisma.transaction.groupBy({
    by: ['status'],
    where: baseWhere,
    _count: {
      id: true,
    },
    _sum: {
      amount: true,
    },
  })
}

async function getTopTransactions(baseWhere: any, limit: number) {
  return await prisma.transaction.findMany({
    where: baseWhere,
    include: {
      paymentMethod: {
        select: {
          type: true,
          provider: true,
        },
      },
    },
    orderBy: {
      amount: 'desc',
    },
    take: limit,
  })
}

async function generateFailureAnalytics(baseWhere: any) {
  const failedTransactions = await prisma.transaction.findMany({
    where: {
      ...baseWhere,
      status: 'failed',
    },
    select: {
      id: true,
      amount: true,
      createdAt: true,
      metadata: true,
      paymentMethodId: true,
    },
  })

  // Analyze failure reasons from metadata
  const failureReasons: Record<string, number> = {}
  let totalFailedAmount = 0

  failedTransactions.forEach(transaction => {
    totalFailedAmount += Number(transaction.amount)
    const metadata = transaction.metadata as any
    const reason = metadata?.failureReason || metadata?.error || 'Unknown'
    failureReasons[reason] = (failureReasons[reason] || 0) + 1
  })

  return {
    totalFailures: failedTransactions.length,
    totalFailedAmount,
    failureReasons: Object.entries(failureReasons)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count),
    recentFailures: failedTransactions
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5),
  }
}