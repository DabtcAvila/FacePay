import { NextRequest, NextResponse } from 'next/server';
import { paymentReconciliationService } from '@/services/payment-reconciliation';
import { monitoring } from '@/lib/monitoring';

/**
 * GET /api/admin/reconciliation
 * Retrieve reconciliation status and recent reports
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const format = searchParams.get('format') as 'json' | 'csv' | undefined;

    monitoring.addBreadcrumb('Reconciliation API request', 'api', 'info', {
      action,
      startDate,
      endDate,
      format
    });

    switch (action) {
      case 'health':
        const health = await paymentReconciliationService.getReconciliationHealth();
        return NextResponse.json({
          success: true,
          data: health
        });

      case 'orphans':
        const start = startDate ? new Date(startDate) : undefined;
        const end = endDate ? new Date(endDate) : undefined;
        const orphans = await paymentReconciliationService.detectOrphanPayments(start, end);
        
        return NextResponse.json({
          success: true,
          data: {
            orphanPayments: orphans,
            count: orphans.length,
            period: { start, end }
          }
        });

      case 'report':
        const reportStart = startDate ? new Date(startDate) : undefined;
        const reportEnd = endDate ? new Date(endDate) : undefined;
        const reportFormat = format || 'json';
        
        const { filePath, report } = await paymentReconciliationService.generateReconciliationReport(
          reportFormat,
          reportStart,
          reportEnd
        );

        if (reportFormat === 'csv') {
          // For CSV, return file download
          const fs = await import('fs');
          const csvContent = fs.readFileSync(filePath, 'utf-8');
          
          return new NextResponse(csvContent, {
            headers: {
              'Content-Type': 'text/csv',
              'Content-Disposition': `attachment; filename="${filePath.split('/').pop()}"`
            }
          });
        }

        return NextResponse.json({
          success: true,
          data: {
            report,
            filePath,
            downloadUrl: reportFormat === 'json' ? `/api/admin/reconciliation/download?path=${encodeURIComponent(filePath)}` : null
          }
        });

      default:
        // Default: return recent reconciliation status
        const recentHealth = await paymentReconciliationService.getReconciliationHealth();
        return NextResponse.json({
          success: true,
          data: {
            status: recentHealth.status,
            pendingTransactions: recentHealth.pendingTransactions,
            recentDiscrepancies: recentHealth.recentDiscrepancies,
            lastChecked: new Date().toISOString()
          }
        });
    }

  } catch (error) {
    monitoring.captureException(error as Error, {
      context: 'reconciliation_api_get',
      extra: { url: request.url }
    });

    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * POST /api/admin/reconciliation
 * Trigger reconciliation processes
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, startDate, endDate, intervalHours } = body;

    monitoring.addBreadcrumb('Reconciliation API POST request', 'api', 'info', {
      action,
      startDate,
      endDate,
      intervalHours
    });

    switch (action) {
      case 'reconcile':
        const start = startDate ? new Date(startDate) : undefined;
        const end = endDate ? new Date(endDate) : undefined;
        
        const report = await paymentReconciliationService.reconcileTransactions(start, end);
        
        return NextResponse.json({
          success: true,
          data: {
            reportId: report.reportId,
            summary: report.summary,
            discrepancies: report.discrepancies,
            orphanPayments: report.orphanPayments,
            recommendations: report.recommendations,
            timestamp: report.timestamp
          }
        });

      case 'sync':
        const syncResult = await paymentReconciliationService.syncPendingPayments();
        
        return NextResponse.json({
          success: true,
          data: {
            updated: syncResult.updated,
            errors: syncResult.errors,
            timestamp: new Date().toISOString()
          }
        });

      case 'schedule':
        const hours = intervalHours || 1;
        paymentReconciliationService.scheduleReconciliation(hours);
        
        return NextResponse.json({
          success: true,
          data: {
            message: `Reconciliation scheduled every ${hours} hours`,
            intervalHours: hours,
            scheduledAt: new Date().toISOString()
          }
        });

      case 'stop-schedule':
        paymentReconciliationService.stopScheduledReconciliation();
        
        return NextResponse.json({
          success: true,
          data: {
            message: 'Reconciliation scheduling stopped',
            stoppedAt: new Date().toISOString()
          }
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action',
          message: 'Supported actions: reconcile, sync, schedule, stop-schedule'
        }, { status: 400 });
    }

  } catch (error) {
    monitoring.captureException(error as Error, {
      context: 'reconciliation_api_post',
      extra: { url: request.url }
    });

    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * PUT /api/admin/reconciliation
 * Update reconciliation configuration
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { scheduleInterval, autoSync, alertThresholds } = body;

    monitoring.addBreadcrumb('Reconciliation API PUT request', 'api', 'info', {
      scheduleInterval,
      autoSync,
      alertThresholds
    });

    // Update scheduling if requested
    if (scheduleInterval) {
      paymentReconciliationService.stopScheduledReconciliation();
      paymentReconciliationService.scheduleReconciliation(scheduleInterval);
    }

    return NextResponse.json({
      success: true,
      data: {
        message: 'Reconciliation configuration updated',
        config: {
          scheduleInterval: scheduleInterval || 'unchanged',
          autoSync: autoSync || 'unchanged',
          alertThresholds: alertThresholds || 'unchanged'
        },
        updatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    monitoring.captureException(error as Error, {
      context: 'reconciliation_api_put',
      extra: { url: request.url }
    });

    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}