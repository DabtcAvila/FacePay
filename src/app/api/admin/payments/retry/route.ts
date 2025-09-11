import { NextRequest, NextResponse } from 'next/server';

interface RetryRequest {
  transactionId: string;
  adminId?: string;
  reason?: string;
  paymentMethod?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: RetryRequest = await request.json();
    const { transactionId, adminId, reason, paymentMethod } = body;

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
    // 2. Validate the transaction can be retried (status, retry count limits, etc.)
    // 3. Create a new transaction attempt with the same details
    // 4. Process through the payment gateway
    // 5. Update transaction status based on outcome
    // 6. Log admin action for audit purposes
    // 7. Send notifications to merchant and customer

    // Mock original transaction
    const mockTransaction = {
      id: transactionId,
      amount: Math.floor(Math.random() * 5000) + 500,
      currency: 'MXN',
      status: 'failed',
      merchantId: `merchant_${Math.floor(Math.random() * 10) + 1}`,
      merchantName: 'Tienda Online SA',
      userEmail: 'user@example.com',
      paymentMethod: paymentMethod || 'Tarjeta de Crédito',
      originalPaymentMethod: 'Tarjeta de Crédito',
      createdAt: new Date(Date.now() - Math.random() * 86400000 * 2).toISOString(), // Last 2 days
      failureReason: 'Insufficient funds',
      retryCount: Math.floor(Math.random() * 3),
      maxRetries: 3,
      lastAttemptAt: new Date(Date.now() - Math.random() * 3600000).toISOString()
    };

    // Validate retry eligibility
    if (mockTransaction.status !== 'failed') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Solo se pueden reintentar transacciones fallidas' 
        },
        { status: 400 }
      );
    }

    if (mockTransaction.retryCount >= mockTransaction.maxRetries) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Se ha alcanzado el límite máximo de reintentos (${mockTransaction.maxRetries})` 
        },
        { status: 400 }
      );
    }

    // Check if enough time has passed since last attempt (minimum 1 hour)
    const lastAttemptTime = new Date(mockTransaction.lastAttemptAt).getTime();
    const minRetryInterval = 60 * 60 * 1000; // 1 hour in milliseconds
    const timeSinceLastAttempt = Date.now() - lastAttemptTime;

    if (timeSinceLastAttempt < minRetryInterval) {
      const remainingTime = Math.ceil((minRetryInterval - timeSinceLastAttempt) / (60 * 1000));
      return NextResponse.json(
        { 
          success: false, 
          error: `Debe esperar al menos 1 hora entre reintentos. Tiempo restante: ${remainingTime} minutos` 
        },
        { status: 429 }
      );
    }

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Simulate retry outcomes with different probabilities
    const retryOutcomes = [
      { status: 'success', probability: 0.40, message: 'Transacción procesada exitosamente' },
      { status: 'pending', probability: 0.25, message: 'Transacción en proceso de verificación' },
      { status: 'failed', probability: 0.20, message: 'Transacción falló nuevamente - Fondos insuficientes', reason: 'insufficient_funds' },
      { status: 'failed', probability: 0.10, message: 'Transacción falló - Tarjeta expirada', reason: 'expired_card' },
      { status: 'failed', probability: 0.05, message: 'Transacción falló - Error del gateway', reason: 'gateway_error' }
    ];

    const random = Math.random();
    let cumulativeProbability = 0;
    let outcome = retryOutcomes[0];

    for (const retryOutcome of retryOutcomes) {
      cumulativeProbability += retryOutcome.probability;
      if (random <= cumulativeProbability) {
        outcome = retryOutcome;
        break;
      }
    }

    const retryAttemptId = `retry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newTransactionId = `tx_${Date.now()}_retry_${mockTransaction.retryCount + 1}`;

    const retryResult = {
      retryAttemptId,
      originalTransactionId: transactionId,
      newTransactionId: outcome.status !== 'failed' ? newTransactionId : null,
      status: outcome.status,
      amount: mockTransaction.amount,
      currency: mockTransaction.currency,
      paymentMethod: paymentMethod || mockTransaction.originalPaymentMethod,
      processedAt: new Date().toISOString(),
      adminId: adminId || 'admin_user',
      reason: reason || 'Admin retry',
      retryCount: mockTransaction.retryCount + 1,
      maxRetries: mockTransaction.maxRetries,
      remainingRetries: mockTransaction.maxRetries - (mockTransaction.retryCount + 1),
      message: outcome.message,
      merchant: {
        id: mockTransaction.merchantId,
        name: mockTransaction.merchantName,
        notified: true,
        webhookSent: outcome.status === 'success'
      },
      customer: {
        email: mockTransaction.userEmail,
        notified: outcome.status === 'success',
        notificationMethod: 'email'
      }
    };

    // Add failure details if retry failed
    if (outcome.status === 'failed') {
      retryResult['failureDetails'] = {
        code: outcome.reason,
        message: outcome.message,
        canRetryAgain: retryResult.remainingRetries > 0,
        nextRetryAvailableAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
        suggestedActions: outcome.reason === 'insufficient_funds' 
          ? ['Contact customer to update payment method', 'Request alternative payment method']
          : outcome.reason === 'expired_card'
          ? ['Request updated card details from customer']
          : ['Contact technical support', 'Try again later']
      };
    }

    // Add success details if retry succeeded
    if (outcome.status === 'success') {
      retryResult['successDetails'] = {
        gatewayTransactionId: `stripe_${Date.now()}`,
        processingFee: Math.floor(mockTransaction.amount * 0.029) + 3, // 2.9% + $0.30
        netAmount: mockTransaction.amount - (Math.floor(mockTransaction.amount * 0.029) + 3),
        estimatedSettlement: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days
        receiptUrl: `https://facepay.com/receipts/${newTransactionId}`
      };
    }

    // Log the retry attempt
    console.log(`Payment retry attempted: ${retryAttemptId} for transaction ${transactionId} by admin ${adminId || 'admin_user'} - Status: ${outcome.status}`);

    return NextResponse.json({
      success: outcome.status !== 'failed',
      data: retryResult,
      message: outcome.message,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error processing payment retry:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error interno del servidor al reintentar pago',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Handle GET requests to fetch retry history
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const transactionId = searchParams.get('transactionId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Mock retry history
    const mockRetries = Array.from({ length: 30 }, (_, i) => ({
      retryAttemptId: `retry_${Date.now() - i * 100000}_${i.toString().padStart(3, '0')}`,
      originalTransactionId: `tx_${Date.now() - i * 200000}_${i}`,
      newTransactionId: Math.random() > 0.3 ? `tx_${Date.now() - i * 150000}_retry` : null,
      status: ['success', 'pending', 'failed'][Math.floor(Math.random() * 3)],
      amount: Math.floor(Math.random() * 3000) + 200,
      currency: 'MXN',
      paymentMethod: ['Tarjeta de Crédito', 'Tarjeta de Débito', 'SPEI'][Math.floor(Math.random() * 3)],
      processedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      adminId: `admin_${Math.floor(Math.random() * 5) + 1}`,
      reason: ['Admin retry', 'Customer request', 'System auto-retry'][Math.floor(Math.random() * 3)],
      merchantName: ['Tienda Online SA', 'Restaurant El Buen Sabor', 'Tech Store MX'][Math.floor(Math.random() * 3)]
    }));

    let filteredRetries = mockRetries;
    if (transactionId) {
      filteredRetries = mockRetries.filter(retry => retry.originalTransactionId === transactionId);
    }

    const startIndex = (page - 1) * limit;
    const paginatedRetries = filteredRetries.slice(startIndex, startIndex + limit);

    const stats = {
      total: filteredRetries.length,
      successful: filteredRetries.filter(r => r.status === 'success').length,
      failed: filteredRetries.filter(r => r.status === 'failed').length,
      pending: filteredRetries.filter(r => r.status === 'pending').length,
      successRate: filteredRetries.length > 0 
        ? (filteredRetries.filter(r => r.status === 'success').length / filteredRetries.length) * 100 
        : 0
    };

    return NextResponse.json({
      success: true,
      data: {
        retries: paginatedRetries,
        stats,
        pagination: {
          current: page,
          limit,
          total: filteredRetries.length,
          pages: Math.ceil(filteredRetries.length / limit)
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching retry history:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error interno del servidor al obtener historial de reintentos',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';