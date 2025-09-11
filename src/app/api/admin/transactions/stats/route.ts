import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { SecurityLogger } from '@/lib/security-logger';

const prisma = new PrismaClient();
const securityLogger = new SecurityLogger('admin-transaction-stats-api');

// GET /api/admin/transactions/stats - Get comprehensive transaction statistics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30d'; // 7d, 30d, 90d, 1y
    const timezone = searchParams.get('timezone') || 'UTC';

    // Calculate date range based on period
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Overall statistics
    const overallStats = await prisma.transaction.aggregate({
      where: {
        createdAt: {
          gte: startDate,
          lte: now
        }
      },
      _count: { id: true },
      _sum: { amount: true },
      _avg: { amount: true }
    });

    // Success rate calculation
    const successfulTransactions = await prisma.transaction.count({
      where: {
        status: 'COMPLETED',
        createdAt: { gte: startDate, lte: now }
      }
    });

    const failedTransactions = await prisma.transaction.count({
      where: {
        status: 'FAILED',
        createdAt: { gte: startDate, lte: now }
      }
    });

    const successRate = overallStats._count.id > 0 
      ? (successfulTransactions / overallStats._count.id) * 100 
      : 0;

    // Daily revenue breakdown
    const dailyStats = await prisma.$queryRaw`
      SELECT 
        DATE(created_at) as date,
        COUNT(*)::int as transactions,
        SUM(amount)::float as revenue,
        COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END)::int as successful,
        COUNT(CASE WHEN status = 'FAILED' THEN 1 END)::int as failed
      FROM "Transaction"
      WHERE created_at >= ${startDate} AND created_at <= ${now}
      GROUP BY DATE(created_at)
      ORDER BY date DESC
      LIMIT 30
    `;

    // Payment method breakdown
    const paymentMethods = await prisma.transaction.groupBy({
      by: ['paymentMethod'],
      where: {
        createdAt: { gte: startDate, lte: now },
        status: 'COMPLETED'
      },
      _count: { paymentMethod: true },
      _sum: { amount: true }
    });

    // Top merchants by volume
    const topMerchants = await prisma.transaction.groupBy({
      by: ['merchantId'],
      where: {
        createdAt: { gte: startDate, lte: now },
        status: 'COMPLETED'
      },
      _count: { merchantId: true },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
      take: 10
    });

    // Get merchant details for top merchants
    const merchantIds = topMerchants.map(m => m.merchantId).filter(Boolean);
    const merchantDetails = await prisma.merchant.findMany({
      where: { id: { in: merchantIds } },
      select: { id: true, name: true, email: true }
    });

    // Refund statistics
    const refundStats = await prisma.refund.aggregate({
      where: {
        createdAt: { gte: startDate, lte: now }
      },
      _count: { id: true },
      _sum: { amount: true }
    });

    // Recent transactions (for real-time monitoring)
    const recentTransactions = await prisma.transaction.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, email: true, name: true }
        },
        merchant: {
          select: { id: true, name: true }
        }
      }
    });

    await securityLogger.log('transaction_stats_viewed', 'admin', { 
      period,
      totalTransactions: overallStats._count.id
    });

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalTransactions: overallStats._count.id,
          totalRevenue: overallStats._sum.amount || 0,
          averageTransaction: overallStats._avg.amount || 0,
          successRate,
          successfulTransactions,
          failedTransactions
        },
        dailyStats,
        paymentMethods: paymentMethods.map(pm => ({
          method: pm.paymentMethod,
          count: pm._count.paymentMethod,
          revenue: pm._sum.amount || 0
        })),
        topMerchants: topMerchants.map(tm => {
          const merchant = merchantDetails.find(m => m.id === tm.merchantId);
          return {
            merchantId: tm.merchantId,
            merchantName: merchant?.name || 'Unknown',
            merchantEmail: merchant?.email || '',
            transactions: tm._count.merchantId,
            revenue: tm._sum.amount || 0
          };
        }),
        refunds: {
          totalRefunds: refundStats._count.id,
          totalRefundAmount: refundStats._sum.amount || 0,
          refundRate: overallStats._sum.amount 
            ? ((refundStats._sum.amount || 0) / overallStats._sum.amount) * 100 
            : 0
        },
        recentTransactions: recentTransactions.slice(0, 10),
        period: {
          startDate,
          endDate: now,
          period
        }
      }
    });

  } catch (error) {
    await securityLogger.log('transaction_stats_error', 'admin', { error: error.message });
    console.error('Transaction stats error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch transaction statistics' 
    }, { status: 500 });
  }
}