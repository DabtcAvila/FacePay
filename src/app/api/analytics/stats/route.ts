import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth-middleware'

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (auth.error) return auth.error

    const [
      totalTransactions,
      completedTransactions,
      totalAmount,
      paymentMethodsCount,
      biometricDataCount,
      recentTransactions,
    ] = await Promise.all([
      // Total transactions count
      prisma.transaction.count({
        where: { userId: auth.user.userId },
      }),
      
      // Completed transactions count
      prisma.transaction.count({
        where: { 
          userId: auth.user.userId,
          status: 'completed',
        },
      }),
      
      // Total amount of completed transactions
      prisma.transaction.aggregate({
        where: { 
          userId: auth.user.userId,
          status: 'completed',
        },
        _sum: {
          amount: true,
        },
      }),
      
      // Payment methods count
      prisma.paymentMethod.count({
        where: { userId: auth.user.userId },
      }),
      
      // Active biometric data count
      prisma.biometricData.count({
        where: { 
          userId: auth.user.userId,
          isActive: true,
        },
      }),
      
      // Recent transactions (last 10)
      prisma.transaction.findMany({
        where: { userId: auth.user.userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          amount: true,
          currency: true,
          status: true,
          description: true,
          createdAt: true,
          paymentMethod: {
            select: {
              type: true,
              provider: true,
            },
          },
        },
      }),
    ])

    // Transaction status breakdown
    const statusBreakdown = await prisma.transaction.groupBy({
      by: ['status'],
      where: { userId: auth.user.userId },
      _count: {
        status: true,
      },
    })

    // Payment method type breakdown
    const paymentMethodBreakdown = await prisma.paymentMethod.groupBy({
      by: ['type'],
      where: { userId: auth.user.userId },
      _count: {
        type: true,
      },
    })

    // Monthly transaction volume (last 12 months)
    const twelveMonthsAgo = new Date()
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)

    const monthlyVolume = await prisma.transaction.groupBy({
      by: ['createdAt'],
      where: {
        userId: auth.user.userId,
        status: 'completed',
        createdAt: {
          gte: twelveMonthsAgo,
        },
      },
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
    })

    const stats = {
      overview: {
        totalTransactions,
        completedTransactions,
        failedTransactions: totalTransactions - completedTransactions,
        totalAmount: totalAmount._sum.amount || 0,
        paymentMethodsCount,
        biometricDataCount,
        successRate: totalTransactions > 0 ? (completedTransactions / totalTransactions) * 100 : 0,
      },
      breakdown: {
        byStatus: statusBreakdown.reduce((acc, item) => {
          acc[item.status] = item._count.status
          return acc
        }, {} as Record<string, number>),
        byPaymentMethod: paymentMethodBreakdown.reduce((acc, item) => {
          acc[item.type] = item._count.type
          return acc
        }, {} as Record<string, number>),
      },
      trends: {
        monthlyVolume: monthlyVolume.map(item => ({
          month: item.createdAt.toISOString().substr(0, 7), // YYYY-MM format
          amount: item._sum.amount || 0,
          count: item._count.id,
        })),
      },
      recentActivity: recentTransactions,
    }

    return createSuccessResponse(stats)

  } catch (error) {
    console.error('Get analytics stats error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}