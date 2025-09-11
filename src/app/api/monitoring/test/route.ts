import { NextRequest, NextResponse } from 'next/server';
import { paymentMonitor } from '@/services/payment-monitoring';

// Test endpoint to generate sample data for demonstration
export async function POST(request: NextRequest) {
  try {
    const { type = 'mixed', count = 10 } = await request.json();

    const transactions = [];
    const now = Date.now();

    for (let i = 0; i < count; i++) {
      const id = `test_tx_${now}_${i}`;
      const userId = `user_${Math.floor(Math.random() * 100)}`;
      const amount = Math.floor(Math.random() * 1000) + 10;
      const timestamp = new Date(now - (i * 60000)); // Spread over last hour

      let status: 'pending' | 'completed' | 'failed' | 'cancelled';
      let errorCode: string | undefined;
      let errorMessage: string | undefined;

      // Determine status based on test type
      switch (type) {
        case 'success':
          status = 'completed';
          break;
        case 'failures':
          status = 'failed';
          errorCode = ['card_declined', 'insufficient_funds', 'expired_card'][Math.floor(Math.random() * 3)];
          errorMessage = {
            'card_declined': 'Your card was declined',
            'insufficient_funds': 'Insufficient funds',
            'expired_card': 'Card has expired'
          }[errorCode];
          break;
        case 'large':
          status = 'completed';
          amount = Math.floor(Math.random() * 50000) + 10000; // $10K - $60K
          break;
        case 'rapid':
          status = Math.random() > 0.3 ? 'completed' : 'failed';
          timestamp = new Date(now - (i * 1000)); // 1 second apart
          if (status === 'failed') {
            errorCode = 'rate_limit_exceeded';
            errorMessage = 'Too many requests';
          }
          break;
        default: // mixed
          status = Math.random() > 0.15 ? 'completed' : 'failed';
          if (status === 'failed') {
            errorCode = ['card_declined', 'insufficient_funds', 'network_error'][Math.floor(Math.random() * 3)];
            errorMessage = {
              'card_declined': 'Your card was declined',
              'insufficient_funds': 'Insufficient funds',  
              'network_error': 'Network connection error'
            }[errorCode];
          }
      }

      const transaction = {
        id,
        userId,
        amount,
        currency: 'USD',
        status,
        paymentMethod: ['stripe', 'paypal', 'bank_transfer'][Math.floor(Math.random() * 3)],
        timestamp,
        responseTime: Math.floor(Math.random() * 2000) + 200, // 200-2200ms
        ...(errorCode && { errorCode }),
        ...(errorMessage && { errorMessage }),
        metadata: {
          testData: true,
          testType: type
        }
      };

      transactions.push(transaction);

      // Track the transaction
      await paymentMonitor.trackTransaction(transaction);
    }

    // Force threshold checks
    await paymentMonitor.checkThresholds();

    // Run anomaly detection
    const anomalies = await paymentMonitor.detectAnomalies();

    return NextResponse.json({
      success: true,
      message: `Generated ${count} test transactions of type '${type}'`,
      data: {
        transactions: transactions.length,
        anomalies,
        activeAlerts: paymentMonitor.getActiveAlerts().length
      }
    });

  } catch (error) {
    console.error('Error generating test data:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to generate test data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Payment Monitoring Test API',
    endpoints: {
      'POST /api/monitoring/test': {
        description: 'Generate test transaction data',
        parameters: {
          type: 'success | failures | large | rapid | mixed (default)',
          count: 'number of transactions to generate (default: 10)'
        },
        examples: [
          { type: 'success', count: 20 },
          { type: 'failures', count: 5 },
          { type: 'large', count: 3 },
          { type: 'rapid', count: 50 }
        ]
      }
    }
  });
}