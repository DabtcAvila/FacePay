import { NextRequest, NextResponse } from 'next/server';

interface RefundRequest {
  transactionId: string;
  amount?: number; // Optional partial refund
  reason?: string;
  adminId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: RefundRequest = await request.json();
    const { transactionId, amount, reason, adminId } = body;

    // Validate required fields
    if (!transactionId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'transactionId es requerido' 
        },
        { status: 400 }
      );
    }

    // Validate transaction ID format
    if (!transactionId.match(/^tx_\d+_\d+$/)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Formato de transactionId inválido' 
        },
        { status: 400 }
      );
    }

    // In production, you would:
    // 1. Fetch the original transaction from database
    // 2. Validate the transaction can be refunded (status, time limits, etc.)
    // 3. Process the refund through the payment gateway (Stripe, MercadoPago, etc.)
    // 4. Update the transaction status in database
    // 5. Send webhook notifications to merchants
    // 6. Log the admin action for audit purposes

    // For this mock implementation, we simulate the refund process
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call delay

    // Mock transaction data
    const mockTransaction = {
      id: transactionId,
      originalAmount: Math.floor(Math.random() * 5000) + 500,
      currency: 'MXN',
      status: 'success',
      merchantId: `merchant_${Math.floor(Math.random() * 10) + 1}`,
      merchantName: 'Tienda Online SA',
      userEmail: 'user@example.com',
      paymentMethod: 'Tarjeta de Crédito',
      createdAt: new Date(Date.now() - Math.random() * 86400000 * 7).toISOString(),
      gatewayTransactionId: `stripe_${Date.now()}`
    };

    // Determine refund amount
    const refundAmount = amount || mockTransaction.originalAmount;
    
    // Validate refund amount
    if (refundAmount > mockTransaction.originalAmount) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'El monto del reembolso no puede ser mayor al monto original' 
        },
        { status: 400 }
      );
    }

    // Check if transaction can be refunded
    const transactionAge = Date.now() - new Date(mockTransaction.createdAt).getTime();
    const maxRefundAge = 180 * 24 * 60 * 60 * 1000; // 180 days in milliseconds
    
    if (transactionAge > maxRefundAge) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'La transacción es muy antigua para ser reembolsada (máximo 180 días)' 
        },
        { status: 400 }
      );
    }

    // Simulate different refund outcomes
    const refundOutcomes = [
      { success: true, probability: 0.85 }, // 85% success rate
      { success: false, error: 'Gateway timeout', probability: 0.10 },
      { success: false, error: 'Insufficient funds in merchant account', probability: 0.05 }
    ];

    const random = Math.random();
    let cumulativeProbability = 0;
    let outcome = refundOutcomes[0];

    for (const refundOutcome of refundOutcomes) {
      cumulativeProbability += refundOutcome.probability;
      if (random <= cumulativeProbability) {
        outcome = refundOutcome;
        break;
      }
    }

    if (!outcome.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Error procesando reembolso: ${outcome.error}`,
          transactionId,
          retryable: true
        },
        { status: 422 }
      );
    }

    // Successful refund
    const refundId = `rfnd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const isPartialRefund = refundAmount < mockTransaction.originalAmount;

    const refundResult = {
      refundId,
      transactionId,
      originalAmount: mockTransaction.originalAmount,
      refundAmount,
      currency: mockTransaction.currency,
      isPartialRefund,
      reason: reason || 'Admin refund',
      status: 'completed',
      gatewayRefundId: `stripe_rfnd_${Date.now()}`,
      processedAt: new Date().toISOString(),
      adminId: adminId || 'admin_user',
      estimatedArrival: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days
      fees: {
        refunded: Math.floor(refundAmount * 0.025), // Refund processing fees
        retained: Math.floor(refundAmount * 0.005)  // Platform fees retained
      },
      merchant: {
        id: mockTransaction.merchantId,
        name: mockTransaction.merchantName,
        notified: true,
        webhookSent: true
      },
      customer: {
        email: mockTransaction.userEmail,
        notified: true,
        notificationMethod: 'email'
      }
    };

    // Log the refund for audit purposes
    console.log(`Refund processed: ${refundId} for transaction ${transactionId} by admin ${adminId || 'admin_user'}`);

    return NextResponse.json({
      success: true,
      data: refundResult,
      message: isPartialRefund 
        ? `Reembolso parcial procesado exitosamente: ${refundAmount} MXN`
        : `Reembolso completo procesado exitosamente: ${refundAmount} MXN`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error processing refund:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error interno del servidor al procesar reembolso',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Also handle GET requests to fetch refund history
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const transactionId = searchParams.get('transactionId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Mock refund history
    const mockRefunds = Array.from({ length: 50 }, (_, i) => ({
      refundId: `rfnd_${Date.now() - i * 100000}_${i.toString().padStart(3, '0')}`,
      transactionId: `tx_${Date.now() - i * 200000}_${i}`,
      amount: Math.floor(Math.random() * 2000) + 100,
      currency: 'MXN',
      reason: ['Admin refund', 'Customer request', 'Fraud prevention', 'System error'][Math.floor(Math.random() * 4)],
      status: ['completed', 'pending', 'failed'][Math.floor(Math.random() * 3)],
      processedAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      adminId: `admin_${Math.floor(Math.random() * 5) + 1}`,
      merchantName: ['Tienda Online SA', 'Restaurant El Buen Sabor', 'Tech Store MX'][Math.floor(Math.random() * 3)]
    }));

    let filteredRefunds = mockRefunds;
    if (transactionId) {
      filteredRefunds = mockRefunds.filter(refund => refund.transactionId === transactionId);
    }

    const startIndex = (page - 1) * limit;
    const paginatedRefunds = filteredRefunds.slice(startIndex, startIndex + limit);

    return NextResponse.json({
      success: true,
      data: {
        refunds: paginatedRefunds,
        pagination: {
          current: page,
          limit,
          total: filteredRefunds.length,
          pages: Math.ceil(filteredRefunds.length / limit)
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching refund history:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error interno del servidor al obtener historial de reembolsos',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';