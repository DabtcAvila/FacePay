import { NextRequest, NextResponse } from 'next/server';
import { paymentMonitor } from '@/services/payment-monitoring';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') === 'true';
    const severity = searchParams.get('severity');
    const type = searchParams.get('type');

    let alerts = paymentMonitor.getActiveAlerts();

    // Apply filters
    if (!activeOnly) {
      // Get all alerts if not filtering for active only
      alerts = Array.from((paymentMonitor as any).alerts.values())
        .sort((a: any, b: any) => b.timestamp.getTime() - a.timestamp.getTime());
    }

    if (severity) {
      alerts = alerts.filter(alert => alert.severity === severity);
    }

    if (type) {
      alerts = alerts.filter(alert => alert.type === type);
    }

    return NextResponse.json({
      success: true,
      data: alerts,
      count: alerts.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching alerts:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch alerts',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { alertId, action } = await request.json();

    if (!alertId || !action) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing alertId or action'
        },
        { status: 400 }
      );
    }

    let result = false;
    let message = '';

    switch (action) {
      case 'acknowledge':
        result = paymentMonitor.acknowledgeAlert(alertId);
        message = result ? 'Alert acknowledged successfully' : 'Alert not found or already acknowledged';
        break;
      
      default:
        return NextResponse.json(
          { 
            success: false, 
            error: 'Invalid action. Supported actions: acknowledge'
          },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: result,
      message,
      alertId
    });

  } catch (error) {
    console.error('Error processing alert action:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process alert action',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}