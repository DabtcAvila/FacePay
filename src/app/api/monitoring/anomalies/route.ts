import { NextRequest, NextResponse } from 'next/server';
import { paymentMonitor } from '@/services/payment-monitoring';

export async function GET(request: NextRequest) {
  try {
    const anomalies = await paymentMonitor.detectAnomalies();

    return NextResponse.json({
      success: true,
      data: anomalies,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error detecting anomalies:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to detect anomalies',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { threshold = 0.7 } = await request.json();

    const anomalies = await paymentMonitor.detectAnomalies();

    // If anomaly detected with high confidence, create an alert
    if (anomalies.isAnomaly && anomalies.confidence >= threshold) {
      await paymentMonitor.createAlert('suspicious_pattern', 'high', {
        anomalyScore: anomalies.score,
        reasons: anomalies.reasons,
        confidence: anomalies.confidence,
        detectedAt: new Date().toISOString()
      });
    }

    return NextResponse.json({
      success: true,
      data: anomalies,
      alertCreated: anomalies.isAnomaly && anomalies.confidence >= threshold,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error running anomaly detection:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to run anomaly detection',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}