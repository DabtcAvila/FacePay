import { NextRequest, NextResponse } from 'next/server';
import { paymentMonitor } from '@/services/payment-monitoring';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventType = searchParams.get('event');

    // This endpoint provides info about available real-time events
    // In a full implementation, this would set up Server-Sent Events (SSE) or WebSocket
    const availableEvents = {
      transaction_tracked: {
        description: 'Emitted when a new transaction is tracked',
        example: {
          id: 'tx_12345',
          userId: 'user_123',
          amount: 100.00,
          status: 'completed'
        }
      },
      alert_created: {
        description: 'Emitted when a new alert is created',
        example: {
          id: 'alert_67890',
          type: 'high_failure_rate',
          severity: 'high',
          title: 'HIGH: High Transaction Failure Rate'
        }
      },
      metrics_updated: {
        description: 'Emitted periodically with updated metrics',
        example: {
          period: '1h',
          totalTransactions: 150,
          successRate: 95.5
        }
      }
    };

    if (eventType && availableEvents[eventType as keyof typeof availableEvents]) {
      return NextResponse.json({
        success: true,
        event: eventType,
        data: availableEvents[eventType as keyof typeof availableEvents]
      });
    }

    return NextResponse.json({
      success: true,
      availableEvents: Object.keys(availableEvents),
      description: 'Real-time monitoring events available via WebSocket or SSE',
      events: availableEvents,
      instructions: {
        websocket: 'Connect to ws://localhost:3000/ws/monitoring for real-time updates',
        sse: 'Use Server-Sent Events at /api/monitoring/stream',
        polling: 'Poll /api/monitoring/metrics?period=1h for regular updates'
      }
    });

  } catch (error) {
    console.error('Error getting real-time info:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get real-time information',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// This would be used to set up Server-Sent Events in a full implementation
export async function POST(request: NextRequest) {
  try {
    const { subscribe, events = [] } = await request.json();

    if (!subscribe) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing subscribe parameter'
        },
        { status: 400 }
      );
    }

    // In a full implementation, this would set up the SSE connection
    // For now, we'll just return the subscription info
    const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return NextResponse.json({
      success: true,
      subscriptionId,
      subscribedEvents: events.length > 0 ? events : ['transaction_tracked', 'alert_created', 'metrics_updated'],
      message: 'Subscription created (mock implementation)',
      instructions: {
        note: 'This is a mock response. In production, this would set up real-time event streaming.',
        realtime: paymentMonitor.getRealtimeUpdates()
      }
    });

  } catch (error) {
    console.error('Error setting up real-time subscription:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to set up subscription',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}