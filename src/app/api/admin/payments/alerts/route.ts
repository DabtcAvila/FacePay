import { NextRequest, NextResponse } from 'next/server';

interface Alert {
  id: string;
  type: 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: string;
  status: 'active' | 'resolved';
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: string;
  affectedServices?: string[];
  metadata?: Record<string, any>;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'active';
    const type = searchParams.get('type');
    const severity = searchParams.get('severity');
    
    // Generate realistic alerts
    const mockAlerts: Alert[] = [
      {
        id: 'alert_001',
        type: 'error',
        title: 'Falla en Gateway de Pagos',
        message: 'El gateway de Stripe está reportando errores intermitentes en el procesamiento de tarjetas de crédito. Tasa de error: 12%',
        timestamp: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
        status: 'active',
        severity: 'high',
        source: 'Payment Gateway Monitor',
        affectedServices: ['stripe', 'credit-card-processing'],
        metadata: {
          errorRate: 0.12,
          affectedTransactions: 45,
          lastOccurrence: new Date(Date.now() - 60000).toISOString()
        }
      },
      {
        id: 'alert_002',
        type: 'warning',
        title: 'Alta tasa de rechazos',
        message: 'La tasa de rechazos de tarjetas ha aumentado un 15% en la última hora. Posible problema con validación de tarjetas.',
        timestamp: new Date(Date.now() - 600000).toISOString(), // 10 minutes ago
        status: 'active',
        severity: 'medium',
        source: 'Transaction Analyzer',
        affectedServices: ['card-validation', 'fraud-detection'],
        metadata: {
          rejectionRate: 0.25,
          normalRate: 0.10,
          increase: 0.15,
          timeWindow: '1h'
        }
      },
      {
        id: 'alert_003',
        type: 'warning',
        title: 'Latencia elevada en API',
        message: 'Los tiempos de respuesta de la API de pagos están por encima del SLA (>2s). Tiempo promedio actual: 3.2s',
        timestamp: new Date(Date.now() - 900000).toISOString(), // 15 minutes ago
        status: 'active',
        severity: 'medium',
        source: 'Performance Monitor',
        affectedServices: ['payments-api', 'database'],
        metadata: {
          currentLatency: 3200,
          slaThreshold: 2000,
          affectedEndpoints: ['/api/payments/process', '/api/payments/verify']
        }
      },
      {
        id: 'alert_004',
        type: 'info',
        title: 'Mantenimiento programado',
        message: 'Mantenimiento del sistema de pagos programado para hoy a las 02:00 AM. Duración estimada: 30 minutos.',
        timestamp: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
        status: 'active',
        severity: 'low',
        source: 'System Administrator',
        affectedServices: ['payments-api', 'webhook-processor'],
        metadata: {
          scheduledTime: '02:00',
          duration: '30 minutes',
          maintenanceType: 'routine'
        }
      },
      {
        id: 'alert_005',
        type: 'error',
        title: 'Webhook delivery failures',
        message: 'Múltiples webhooks no han podido ser entregados a merchants. 23 webhooks pendientes de reintento.',
        timestamp: new Date(Date.now() - 2700000).toISOString(), // 45 minutes ago
        status: 'active',
        severity: 'high',
        source: 'Webhook Service',
        affectedServices: ['webhook-processor', 'notification-service'],
        metadata: {
          failedWebhooks: 23,
          affectedMerchants: 8,
          lastRetry: new Date(Date.now() - 300000).toISOString()
        }
      },
      {
        id: 'alert_006',
        type: 'warning',
        title: 'Uso elevado de CPU',
        message: 'Los servidores de procesamiento de pagos están reportando uso de CPU por encima del 85%',
        timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        status: 'resolved',
        severity: 'medium',
        source: 'Infrastructure Monitor',
        affectedServices: ['payment-processor', 'load-balancer'],
        metadata: {
          cpuUsage: 0.87,
          threshold: 0.85,
          resolvedAt: new Date(Date.now() - 1800000).toISOString()
        }
      },
      {
        id: 'alert_007',
        type: 'info',
        title: 'Nueva integración disponible',
        message: 'La integración con MercadoPago v2 está ahora disponible para todos los merchants.',
        timestamp: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
        status: 'resolved',
        severity: 'low',
        source: 'Product Team',
        affectedServices: ['integrations'],
        metadata: {
          integration: 'MercadoPago v2',
          availability: 'all merchants'
        }
      },
      {
        id: 'alert_008',
        type: 'error',
        title: 'Base de datos de transacciones lenta',
        message: 'Consultas a la base de datos de transacciones están tardando más de 5 segundos',
        timestamp: new Date(Date.now() - 10800000).toISOString(), // 3 hours ago
        status: 'resolved',
        severity: 'critical',
        source: 'Database Monitor',
        affectedServices: ['database', 'transaction-history'],
        metadata: {
          queryTime: 5200,
          affectedQueries: ['transaction-list', 'merchant-dashboard'],
          resolvedBy: 'index optimization'
        }
      }
    ];

    // Filter alerts based on query parameters
    let filteredAlerts = mockAlerts.filter(alert => {
      if (status && alert.status !== status) return false;
      if (type && alert.type !== type) return false;
      if (severity && alert.severity !== severity) return false;
      return true;
    });

    // Sort by timestamp (newest first)
    filteredAlerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Calculate statistics
    const stats = {
      total: filteredAlerts.length,
      active: mockAlerts.filter(a => a.status === 'active').length,
      resolved: mockAlerts.filter(a => a.status === 'resolved').length,
      bySeverity: {
        critical: mockAlerts.filter(a => a.severity === 'critical').length,
        high: mockAlerts.filter(a => a.severity === 'high').length,
        medium: mockAlerts.filter(a => a.severity === 'medium').length,
        low: mockAlerts.filter(a => a.severity === 'low').length,
      },
      byType: {
        error: mockAlerts.filter(a => a.type === 'error').length,
        warning: mockAlerts.filter(a => a.type === 'warning').length,
        info: mockAlerts.filter(a => a.type === 'info').length,
      }
    };

    return NextResponse.json({
      success: true,
      data: {
        alerts: filteredAlerts,
        stats
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching alerts:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error interno del servidor al obtener alertas',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { alertId, action } = body;

    if (!alertId || !action) {
      return NextResponse.json(
        { success: false, error: 'alertId y action son requeridos' },
        { status: 400 }
      );
    }

    // Simulate alert action (resolve, acknowledge, etc.)
    let result;
    switch (action) {
      case 'resolve':
        result = { 
          alertId, 
          action: 'resolved', 
          timestamp: new Date().toISOString(),
          resolvedBy: 'admin_user'
        };
        break;
      case 'acknowledge':
        result = { 
          alertId, 
          action: 'acknowledged', 
          timestamp: new Date().toISOString(),
          acknowledgedBy: 'admin_user'
        };
        break;
      default:
        return NextResponse.json(
          { success: false, error: 'Acción no válida' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: `Alerta ${alertId} ${action === 'resolve' ? 'resuelta' : 'reconocida'} exitosamente`
    });

  } catch (error) {
    console.error('Error handling alert action:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error interno del servidor al procesar acción de alerta',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Enable real-time updates
export const dynamic = 'force-dynamic';