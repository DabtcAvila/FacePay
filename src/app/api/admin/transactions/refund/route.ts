import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { SecurityLogger } from '@/lib/security-logger';

const prisma = new PrismaClient();
const securityLogger = new SecurityLogger('admin-refund-api');

// POST /api/admin/transactions/refund - Process refund
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      transactionId, 
      amount, 
      reason, 
      type = 'FULL', // FULL or PARTIAL
      adminNote 
    } = body;

    // Validation
    if (!transactionId || !reason) {
      return NextResponse.json({
        success: false,
        error: 'Transaction ID and reason are required'
      }, { status: 400 });
    }

    // Get transaction details
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        user: {
          select: { id: true, email: true, name: true }
        },
        merchant: {
          select: { id: true, name: true, email: true }
        },
        refunds: true
      }
    });

    if (!transaction) {
      return NextResponse.json({
        success: false,
        error: 'Transaction not found'
      }, { status: 404 });
    }

    // Check if transaction is refundable
    if (transaction.status !== 'COMPLETED') {
      return NextResponse.json({
        success: false,
        error: 'Only completed transactions can be refunded'
      }, { status: 400 });
    }

    // Calculate refund amount
    let refundAmount = type === 'FULL' ? transaction.amount : amount;
    
    if (!refundAmount || refundAmount <= 0) {
      return NextResponse.json({
        success: false,
        error: 'Invalid refund amount'
      }, { status: 400 });
    }

    // Check if refund amount exceeds available amount
    const totalRefunded = transaction.refunds.reduce((sum, refund) => sum + refund.amount, 0);
    const availableForRefund = transaction.amount - totalRefunded;

    if (refundAmount > availableForRefund) {
      return NextResponse.json({
        success: false,
        error: `Refund amount exceeds available amount (${availableForRefund})`
      }, { status: 400 });
    }

    // Create refund record
    const refund = await prisma.refund.create({
      data: {
        id: `refund_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        transactionId,
        amount: refundAmount,
        reason,
        type,
        status: 'PROCESSING',
        adminNote,
        processedBy: 'admin', // In real app, get from session
        processedAt: new Date()
      }
    });

    // In a real implementation, you would integrate with payment processor here
    // For now, we'll simulate the refund processing
    
    // Update refund status to completed (in real app, this would be done by webhook)
    const completedRefund = await prisma.refund.update({
      where: { id: refund.id },
      data: { 
        status: 'COMPLETED',
        completedAt: new Date()
      }
    });

    // Update transaction status if fully refunded
    const newTotalRefunded = totalRefunded + refundAmount;
    if (newTotalRefunded >= transaction.amount) {
      await prisma.transaction.update({
        where: { id: transactionId },
        data: { status: 'REFUNDED' }
      });
    }

    await securityLogger.log('refund_processed', 'admin', {
      transactionId,
      refundId: refund.id,
      amount: refundAmount,
      type,
      reason,
      userId: transaction.userId,
      merchantId: transaction.merchantId
    });

    // Send notification email (in real app)
    // await sendRefundNotification(transaction.user.email, refund);

    return NextResponse.json({
      success: true,
      data: {
        refund: completedRefund,
        transaction: {
          id: transaction.id,
          originalAmount: transaction.amount,
          totalRefunded: newTotalRefunded,
          remainingAmount: transaction.amount - newTotalRefunded
        }
      },
      message: 'Refund processed successfully'
    }, { status: 201 });

  } catch (error) {
    await securityLogger.log('refund_processing_error', 'admin', { 
      transactionId: request.body?.transactionId,
      error: error.message 
    });
    console.error('Refund processing error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to process refund' 
    }, { status: 500 });
  }
}

// GET /api/admin/transactions/refund - Get refunds list
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    
    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    // Get refunds and total count
    const [refunds, total] = await Promise.all([
      prisma.refund.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          transaction: {
            include: {
              user: {
                select: { id: true, email: true, name: true }
              },
              merchant: {
                select: { id: true, name: true }
              }
            }
          }
        }
      }),
      prisma.refund.count({ where })
    ]);

    // Get refund statistics
    const stats = await prisma.refund.aggregate({
      where,
      _count: { id: true },
      _sum: { amount: true },
      _avg: { amount: true }
    });

    return NextResponse.json({
      success: true,
      data: {
        refunds,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        },
        stats: {
          totalRefunds: stats._count.id,
          totalAmount: stats._sum.amount || 0,
          averageAmount: stats._avg.amount || 0
        }
      }
    });

  } catch (error) {
    console.error('Get refunds error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch refunds' 
    }, { status: 500 });
  }
}