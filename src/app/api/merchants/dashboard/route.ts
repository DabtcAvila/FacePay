/**
 * Merchant Dashboard API - Analytics and Metrics
 * GET /api/merchants/dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireMerchant, getMerchantIdFromRequest, getMerchantTestMode } from '@/middleware/multitenancy';
import { z } from 'zod';

// Query parameters validation
const DashboardQuerySchema = z.object({
  period: z.enum(['24h', '7d', '30d', '90d', '1y']).default('30d'),
  timezone: z.string().optional(),
  includeComparison: z.string().transform(val => val === 'true').default('false')
});

export const GET = requireMerchant(async (request: Request) => {
  try {
    const merchantId = getMerchantIdFromRequest(request);
    const testMode = getMerchantTestMode(request);
    
    if (!merchantId) {
      return Response.json({ error: 'Merchant context required' }, { status: 401 });
    }
    
    // Parse query parameters
    const url = new URL(request.url);
    const queryResult = DashboardQuerySchema.safeParse({
      period: url.searchParams.get('period'),
      timezone: url.searchParams.get('timezone'),
      includeComparison: url.searchParams.get('includeComparison')
    });
    
    if (!queryResult.success) {
      return Response.json(
        { error: 'Invalid query parameters', details: queryResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    
    const { period, timezone, includeComparison } = queryResult.data;
    
    // Calculate date ranges
    const now = new Date();
    const ranges = calculateDateRanges(period, now, timezone);
    
    // Execute dashboard queries in parallel
    const [
      merchant,
      transactionMetrics,
      revenueMetrics,
      topPaymentMethods,
      recentTransactions,
      userGrowth,
      errorRates,
      webhookStats,
      comparisonData
    ] = await Promise.all([
      // Merchant basic info
      prisma.merchant.findUnique({
        where: { id: merchantId },
        select: {
          id: true,
          email: true,
          companyName: true,
          plan: true,
          kycStatus: true,
          status: true,
          testMode: true,
          createdAt: true,
          onboardedAt: true,
          firstTransactionAt: true,
          currentBalance: true,
          creditLimit: true
        }
      }),
      
      // Transaction metrics
      getTransactionMetrics(merchantId, ranges.current.start, ranges.current.end),
      
      // Revenue metrics
      getRevenueMetrics(merchantId, ranges.current.start, ranges.current.end),
      
      // Top payment methods
      getTopPaymentMethods(merchantId, ranges.current.start, ranges.current.end),
      
      // Recent transactions
      getRecentTransactions(merchantId, 10),
      
      // User growth
      getUserGrowth(merchantId, ranges.current.start, ranges.current.end),
      
      // Error rates
      getErrorRates(merchantId, ranges.current.start, ranges.current.end),
      
      // Webhook statistics
      getWebhookStats(merchantId, ranges.current.start, ranges.current.end),
      
      // Comparison data if requested
      includeComparison 
        ? getTransactionMetrics(merchantId, ranges.previous.start, ranges.previous.end)
        : null
    ]);
    
    if (!merchant) {
      return Response.json({ error: 'Merchant not found' }, { status: 404 });
    }
    
    // Prepare dashboard response
    const dashboard = {
      merchant: {
        ...merchant,
        isLive: merchant.kycStatus === 'verified' && !testMode
      },
      metrics: {
        period,
        dateRange: {
          start: ranges.current.start.toISOString(),
          end: ranges.current.end.toISOString()
        },
        transactions: transactionMetrics,
        revenue: revenueMetrics,
        users: userGrowth,
        errors: errorRates,
        webhooks: webhookStats
      },
      insights: {
        topPaymentMethods,
        recentActivity: recentTransactions
      },
      ...(includeComparison && comparisonData && {
        comparison: {
          period: getPreviousPeriodLabel(period),
          transactions: comparisonData,
          growth: calculateGrowthRates(transactionMetrics, comparisonData)
        }
      })
    };
    
    return Response.json(dashboard, { status: 200 });
    
  } catch (error) {
    console.error('Dashboard error:', error);
    
    return Response.json(
      { error: 'Failed to load dashboard data' },
      { status: 500 }
    );
  }
});

/**
 * Calculate date ranges for metrics
 */
function calculateDateRanges(period: string, now: Date, timezone?: string) {
  const end = new Date(now);
  const start = new Date(now);
  
  // Calculate current period
  switch (period) {
    case '24h':
      start.setHours(start.getHours() - 24);
      break;
    case '7d':
      start.setDate(start.getDate() - 7);
      break;
    case '30d':
      start.setDate(start.getDate() - 30);
      break;
    case '90d':
      start.setDate(start.getDate() - 90);
      break;
    case '1y':
      start.setFullYear(start.getFullYear() - 1);
      break;
  }
  
  // Calculate previous period for comparison
  const previousEnd = new Date(start);
  const previousStart = new Date(start);
  
  const periodLength = end.getTime() - start.getTime();
  previousStart.setTime(previousEnd.getTime() - periodLength);
  
  return {
    current: { start, end },
    previous: { start: previousStart, end: previousEnd }
  };
}

/**
 * Get transaction metrics
 */
async function getTransactionMetrics(merchantId: string, startDate: Date, endDate: Date) {
  const [total, successful, failed, volume] = await Promise.all([
    prisma.transaction.count({
      where: {
        merchantId,
        createdAt: { gte: startDate, lte: endDate }
      }
    }),
    
    prisma.transaction.count({
      where: {
        merchantId,
        status: 'completed',
        createdAt: { gte: startDate, lte: endDate }
      }
    }),
    
    prisma.transaction.count({
      where: {
        merchantId,
        status: 'failed',
        createdAt: { gte: startDate, lte: endDate }
      }
    }),
    
    prisma.transaction.aggregate({
      where: {
        merchantId,
        status: 'completed',
        createdAt: { gte: startDate, lte: endDate }
      },
      _sum: { amount: true }
    })
  ]);
  
  return {
    total,
    successful,
    failed,
    successRate: total > 0 ? (successful / total) * 100 : 0,
    volume: volume._sum.amount || 0,
    averageAmount: successful > 0 ? Number(volume._sum.amount || 0) / successful : 0
  };
}

/**
 * Get revenue metrics
 */
async function getRevenueMetrics(merchantId: string, startDate: Date, endDate: Date) {
  const revenue = await prisma.transaction.aggregate({
    where: {
      merchantId,
      status: 'completed',
      createdAt: { gte: startDate, lte: endDate }
    },
    _sum: { 
      amount: true,
      merchantFee: true 
    }
  });
  
  const fees = await prisma.merchantUsage.aggregate({
    where: {
      merchantId,
      createdAt: { gte: startDate, lte: endDate }
    },
    _sum: { cost: true }
  });
  
  return {
    gross: Number(revenue._sum.amount || 0),
    fees: Number(revenue._sum.merchantFee || 0),
    net: Number(revenue._sum.amount || 0) - Number(revenue._sum.merchantFee || 0),
    platformFees: Number(fees._sum.cost || 0)
  };
}

/**
 * Get top payment methods
 */
async function getTopPaymentMethods(merchantId: string, startDate: Date, endDate: Date) {
  const methods = await prisma.transaction.groupBy({
    by: ['paymentMethodId'],
    where: {
      merchantId,
      status: 'completed',
      createdAt: { gte: startDate, lte: endDate }
    },
    _count: true,
    _sum: { amount: true },
    orderBy: { _count: { paymentMethodId: 'desc' } },
    take: 5
  });
  
  // Get payment method details
  const methodDetails = await prisma.paymentMethod.findMany({
    where: {
      id: { in: methods.map(m => m.paymentMethodId) }
    },
    select: {
      id: true,
      type: true,
      provider: true
    }
  });
  
  return methods.map(method => {
    const details = methodDetails.find(d => d.id === method.paymentMethodId);
    return {
      id: method.paymentMethodId,
      type: details?.type || 'unknown',
      provider: details?.provider || 'unknown',
      count: method._count,
      volume: Number(method._sum.amount || 0)
    };
  });
}

/**
 * Get recent transactions
 */
async function getRecentTransactions(merchantId: string, limit: number) {
  return await prisma.transaction.findMany({
    where: { merchantId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      amount: true,
      currency: true,
      status: true,
      description: true,
      createdAt: true,
      user: {
        select: {
          email: true,
          name: true
        }
      },
      paymentMethod: {
        select: {
          type: true,
          provider: true
        }
      }
    }
  });
}

/**
 * Get user growth metrics
 */
async function getUserGrowth(merchantId: string, startDate: Date, endDate: Date) {
  const [total, newUsers, activeUsers] = await Promise.all([
    prisma.user.count({
      where: { merchantId }
    }),
    
    prisma.user.count({
      where: {
        merchantId,
        createdAt: { gte: startDate, lte: endDate }
      }
    }),
    
    prisma.user.count({
      where: {
        merchantId,
        lastLoginAt: { gte: startDate, lte: endDate }
      }
    })
  ]);
  
  return {
    total,
    new: newUsers,
    active: activeUsers
  };
}

/**
 * Get error rates
 */
async function getErrorRates(merchantId: string, startDate: Date, endDate: Date) {
  const errors = await prisma.errorReport.count({
    where: {
      merchantId,
      timestamp: { gte: startDate, lte: endDate }
    }
  });
  
  const criticalErrors = await prisma.errorReport.count({
    where: {
      merchantId,
      severity: 'critical',
      timestamp: { gte: startDate, lte: endDate }
    }
  });
  
  return {
    total: errors,
    critical: criticalErrors
  };
}

/**
 * Get webhook statistics
 */
async function getWebhookStats(merchantId: string, startDate: Date, endDate: Date) {
  const [total, successful, failed] = await Promise.all([
    prisma.webhookDelivery.count({
      where: {
        webhook: { merchantId },
        createdAt: { gte: startDate, lte: endDate }
      }
    }),
    
    prisma.webhookDelivery.count({
      where: {
        webhook: { merchantId },
        status: 'success',
        createdAt: { gte: startDate, lte: endDate }
      }
    }),
    
    prisma.webhookDelivery.count({
      where: {
        webhook: { merchantId },
        status: 'failed',
        createdAt: { gte: startDate, lte: endDate }
      }
    })
  ]);
  
  return {
    total,
    successful,
    failed,
    successRate: total > 0 ? (successful / total) * 100 : 0
  };
}

/**
 * Calculate growth rates
 */
function calculateGrowthRates(current: any, previous: any) {
  const calculateGrowth = (curr: number, prev: number) => {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return ((curr - prev) / prev) * 100;
  };
  
  return {
    transactions: calculateGrowth(current.total, previous.total),
    volume: calculateGrowth(current.volume, previous.volume),
    successRate: current.successRate - previous.successRate
  };
}

/**
 * Get previous period label
 */
function getPreviousPeriodLabel(period: string): string {
  const labels: Record<string, string> = {
    '24h': 'Previous 24h',
    '7d': 'Previous 7 days',
    '30d': 'Previous 30 days',
    '90d': 'Previous 90 days',
    '1y': 'Previous year'
  };
  return labels[period] || 'Previous period';
}