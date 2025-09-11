import { NextRequest, NextResponse } from 'next/server';
import { paymentMonitor } from '@/services/payment-monitoring';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') as '1h' | '24h' | '7d' | '30d' || '24h';

    const metrics = await paymentMonitor.getMetrics(period);

    return NextResponse.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching monitoring metrics:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch monitoring metrics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const transactionData = await request.json();

    // Validate required fields
    const requiredFields = ['id', 'userId', 'amount', 'currency', 'status', 'paymentMethod'];
    const missingFields = requiredFields.filter(field => !transactionData[field]);
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields',
          missingFields
        },
        { status: 400 }
      );
    }

    // Track the transaction
    await paymentMonitor.trackTransaction({
      ...transactionData,
      timestamp: transactionData.timestamp ? new Date(transactionData.timestamp) : new Date()
    });

    return NextResponse.json({
      success: true,
      message: 'Transaction tracked successfully',
      transactionId: transactionData.id
    });

  } catch (error) {
    console.error('Error tracking transaction:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to track transaction',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}