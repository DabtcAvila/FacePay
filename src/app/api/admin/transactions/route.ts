import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { SecurityLogger } from '@/lib/security-logger';

const prisma = new PrismaClient();
const securityLogger = new SecurityLogger('admin-transactions-api');

// GET /api/admin/transactions - List transactions with filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status') || '';
    const userId = searchParams.get('userId') || '';
    const merchantId = searchParams.get('merchantId') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    const minAmount = parseFloat(searchParams.get('minAmount') || '0');
    const maxAmount = parseFloat(searchParams.get('maxAmount') || '999999999');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      amount: {
        gte: minAmount,
        lte: maxAmount
      }
    };
    
    if (status) {
      where.status = status;
    }

    if (userId) {
      where.userId = userId;
    }

    if (merchantId) {
      where.merchantId = merchantId;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    // Get transactions and total count
    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true
            }
          },
          merchant: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      }),
      prisma.transaction.count({ where })
    ]);

    // Get summary stats
    const stats = await prisma.transaction.aggregate({
      where,
      _count: { id: true },
      _sum: { amount: true },
      _avg: { amount: true }
    });

    // Get status breakdown
    const statusBreakdown = await prisma.transaction.groupBy({
      by: ['status'],
      _count: { status: true },
      _sum: { amount: true },
      where: {
        createdAt: where.createdAt || undefined
      }
    });

    await securityLogger.log('transactions_listed', 'admin', { 
      total: transactions.length,
      filters: { status, userId, merchantId, dateRange: !!startDate || !!endDate }
    });

    return NextResponse.json({
      success: true,
      data: {
        transactions,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        },
        stats: {
          totalTransactions: stats._count.id,
          totalAmount: stats._sum.amount || 0,
          averageAmount: stats._avg.amount || 0,
          statusBreakdown: statusBreakdown.map(item => ({
            status: item.status,
            count: item._count.status,
            totalAmount: item._sum.amount || 0
          }))
        }
      }
    });

  } catch (error) {
    await securityLogger.log('transactions_list_error', 'admin', { error: error.message });
    console.error('Transactions list error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch transactions' 
    }, { status: 500 });
  }
}