import Stripe from 'stripe';
import { prisma } from '../lib/prisma';
import { monitoring } from '../lib/monitoring';
import { Prisma, Transaction } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

// Initialize Stripe client
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

// Interfaces for reconciliation data structures
interface StripeTransaction {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created: number;
  payment_intent?: string;
  payment_method?: string;
  description?: string | null;
  metadata?: Record<string, string>;
  customer?: string;
}

interface LocalTransaction {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethodId: string;
  description?: string | null;
  reference?: string | null;
  metadata?: Prisma.JsonValue;
  createdAt: Date;
  completedAt?: Date | null;
}

interface ReconciliationDiscrepancy {
  type: 'amount_mismatch' | 'status_mismatch' | 'missing_local' | 'missing_stripe' | 'metadata_mismatch';
  localTransaction?: LocalTransaction;
  stripeTransaction?: StripeTransaction;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recommendedAction: string;
}

interface ReconciliationReport {
  reportId: string;
  timestamp: Date;
  period: {
    start: Date;
    end: Date;
  };
  summary: {
    totalLocalTransactions: number;
    totalStripeTransactions: number;
    matchedTransactions: number;
    discrepancies: number;
    orphanPayments: {
      local: number;
      stripe: number;
    };
    totalAmountLocal: number;
    totalAmountStripe: number;
    amountDiscrepancy: number;
  };
  discrepancies: ReconciliationDiscrepancy[];
  orphanPayments: {
    local: LocalTransaction[];
    stripe: StripeTransaction[];
  };
  recommendations: string[];
}

interface OrphanPayment {
  id: string;
  type: 'local' | 'stripe';
  amount: number;
  currency: string;
  status: string;
  createdAt: Date;
  reason: string;
  suggestedAction: string;
}

export class PaymentReconciliationService {
  private static instance: PaymentReconciliationService;
  private reconciliationScheduler: NodeJS.Timeout | null = null;
  private isReconciling = false;

  private constructor() {}

  public static getInstance(): PaymentReconciliationService {
    if (!PaymentReconciliationService.instance) {
      PaymentReconciliationService.instance = new PaymentReconciliationService();
    }
    return PaymentReconciliationService.instance;
  }

  /**
   * Main reconciliation method - compares local transactions with Stripe
   */
  public async reconcileTransactions(
    startDate?: Date,
    endDate?: Date
  ): Promise<ReconciliationReport> {
    if (this.isReconciling) {
      throw new Error('Reconciliation already in progress');
    }

    this.isReconciling = true;
    const reconciliationStart = Date.now();
    
    try {
      monitoring.addBreadcrumb('Starting payment reconciliation', 'reconciliation', 'info', {
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString()
      });

      // Set default date range (last 24 hours if not provided)
      const end = endDate || new Date();
      const start = startDate || new Date(end.getTime() - 24 * 60 * 60 * 1000);

      // Fetch transactions from both sources in parallel
      const [localTransactions, stripeTransactions] = await Promise.all([
        this.fetchLocalTransactions(start, end),
        this.fetchStripeTransactions(start, end)
      ]);

      monitoring.trackPerformanceMetric('reconciliation_data_fetch', Date.now() - reconciliationStart);

      // Perform reconciliation analysis
      const report = await this.analyzeTransactions(
        localTransactions,
        stripeTransactions,
        start,
        end
      );

      // Log reconciliation results
      await this.logReconciliationResult(report);

      // Handle critical discrepancies
      await this.handleCriticalDiscrepancies(report);

      monitoring.captureMessage(
        `Payment reconciliation completed: ${report.discrepancies.length} discrepancies found`,
        report.discrepancies.length > 0 ? 'warning' : 'info',
        { 
          reportId: report.reportId,
          discrepancyCount: report.discrepancies.length,
          duration: Date.now() - reconciliationStart
        }
      );

      return report;

    } catch (error) {
      monitoring.captureException(error as Error, {
        context: 'payment_reconciliation',
        extra: { startDate, endDate }
      });
      throw error;
    } finally {
      this.isReconciling = false;
      monitoring.trackPerformanceMetric('reconciliation_total', Date.now() - reconciliationStart);
    }
  }

  /**
   * Detect orphan payments that exist in one system but not the other
   */
  public async detectOrphanPayments(
    startDate?: Date,
    endDate?: Date
  ): Promise<OrphanPayment[]> {
    try {
      const end = endDate || new Date();
      const start = startDate || new Date(end.getTime() - 24 * 60 * 60 * 1000);

      const [localTransactions, stripeTransactions] = await Promise.all([
        this.fetchLocalTransactions(start, end),
        this.fetchStripeTransactions(start, end)
      ]);

      const orphans: OrphanPayment[] = [];

      // Find local transactions without Stripe matches
      for (const localTx of localTransactions) {
        const stripeMatch = stripeTransactions.find(stripeTx => 
          this.isTransactionMatch(localTx, stripeTx)
        );

        if (!stripeMatch) {
          orphans.push({
            id: localTx.id,
            type: 'local',
            amount: Number(localTx.amount),
            currency: localTx.currency,
            status: localTx.status,
            createdAt: localTx.createdAt,
            reason: 'No corresponding Stripe transaction found',
            suggestedAction: localTx.status === 'completed' ? 
              'Verify if payment was processed outside Stripe' : 
              'Cancel transaction if payment was not processed'
          });
        }
      }

      // Find Stripe transactions without local matches
      for (const stripeTx of stripeTransactions) {
        const localMatch = localTransactions.find(localTx => 
          this.isTransactionMatch(localTx, stripeTx)
        );

        if (!localMatch) {
          orphans.push({
            id: stripeTx.id,
            type: 'stripe',
            amount: stripeTx.amount / 100, // Convert from cents
            currency: stripeTx.currency.toUpperCase(),
            status: stripeTx.status,
            createdAt: new Date(stripeTx.created * 1000),
            reason: 'No corresponding local transaction found',
            suggestedAction: stripeTx.status === 'succeeded' ? 
              'Create local transaction record' : 
              'Investigate failed Stripe payment'
          });
        }
      }

      monitoring.captureMessage(
        `Detected ${orphans.length} orphan payments`,
        orphans.length > 0 ? 'warning' : 'info',
        { orphanCount: orphans.length, period: { start, end } }
      );

      return orphans;

    } catch (error) {
      monitoring.captureException(error as Error, {
        context: 'detect_orphan_payments',
        extra: { startDate, endDate }
      });
      throw error;
    }
  }

  /**
   * Sync pending payments and update their states
   */
  public async syncPendingPayments(): Promise<{
    updated: number;
    errors: Array<{ id: string; error: string }>;
  }> {
    try {
      const pendingTransactions = await prisma.transaction.findMany({
        where: {
          status: 'pending',
          isActive: true,
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        },
        include: {
          user: true,
          paymentMethod: true
        }
      });

      const results = {
        updated: 0,
        errors: [] as Array<{ id: string; error: string }>
      };

      for (const transaction of pendingTransactions) {
        try {
          let stripePayment: Stripe.PaymentIntent | Stripe.Charge | null = null;

          // Try to find the Stripe payment by reference or metadata
          if (transaction.reference) {
            try {
              stripePayment = await stripe.paymentIntents.retrieve(transaction.reference);
            } catch {
              try {
                stripePayment = await stripe.charges.retrieve(transaction.reference);
              } catch {
                // Payment not found in Stripe
              }
            }
          }

          if (stripePayment) {
            const stripeStatus = this.mapStripeStatusToLocal(stripePayment.status);
            
            if (stripeStatus !== transaction.status) {
              await prisma.transaction.update({
                where: { id: transaction.id },
                data: {
                  status: stripeStatus,
                  completedAt: stripeStatus === 'completed' ? new Date() : null,
                  updatedAt: new Date()
                }
              });

              results.updated++;

              // Log the status update
              await this.logTransactionStatusUpdate(
                transaction.id,
                transaction.status,
                stripeStatus,
                'stripe_sync'
              );
            }
          } else {
            // Handle transactions older than threshold without Stripe records
            const ageHours = (Date.now() - transaction.createdAt.getTime()) / (1000 * 60 * 60);
            
            if (ageHours > 24) { // 24 hours threshold
              await prisma.transaction.update({
                where: { id: transaction.id },
                data: {
                  status: 'failed',
                  updatedAt: new Date()
                }
              });

              results.updated++;
              
              await this.logTransactionStatusUpdate(
                transaction.id,
                transaction.status,
                'failed',
                'timeout_sync'
              );
            }
          }

        } catch (error) {
          results.errors.push({
            id: transaction.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          });

          monitoring.captureException(error as Error, {
            context: 'sync_pending_payment',
            extra: { transactionId: transaction.id }
          });
        }
      }

      monitoring.captureMessage(
        `Sync pending payments completed: ${results.updated} updated, ${results.errors.length} errors`,
        results.errors.length > 0 ? 'warning' : 'info',
        { updated: results.updated, errors: results.errors.length }
      );

      return results;

    } catch (error) {
      monitoring.captureException(error as Error, {
        context: 'sync_pending_payments'
      });
      throw error;
    }
  }

  /**
   * Generate comprehensive reconciliation report
   */
  public async generateReconciliationReport(
    format: 'json' | 'csv' = 'json',
    startDate?: Date,
    endDate?: Date
  ): Promise<{ filePath: string; report: ReconciliationReport }> {
    try {
      const report = await this.reconcileTransactions(startDate, endDate);
      
      // Create reports directory if it doesn't exist
      const reportsDir = path.join(process.cwd(), 'reports', 'reconciliation');
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `reconciliation-report-${timestamp}.${format}`;
      const filePath = path.join(reportsDir, filename);

      if (format === 'json') {
        fs.writeFileSync(filePath, JSON.stringify(report, null, 2));
      } else if (format === 'csv') {
        const csv = this.convertReportToCSV(report);
        fs.writeFileSync(filePath, csv);
      }

      monitoring.captureMessage(
        `Reconciliation report generated: ${filename}`,
        'info',
        { reportId: report.reportId, format, filePath }
      );

      return { filePath, report };

    } catch (error) {
      monitoring.captureException(error as Error, {
        context: 'generate_reconciliation_report',
        extra: { format, startDate, endDate }
      });
      throw error;
    }
  }

  /**
   * Schedule automatic reconciliation
   */
  public scheduleReconciliation(intervalHours: number = 1): void {
    try {
      // Clear existing scheduler if any
      if (this.reconciliationScheduler) {
        clearInterval(this.reconciliationScheduler);
      }

      const intervalMs = intervalHours * 60 * 60 * 1000;

      this.reconciliationScheduler = setInterval(async () => {
        try {
          monitoring.addBreadcrumb('Scheduled reconciliation starting', 'reconciliation', 'info');
          
          const report = await this.reconcileTransactions();
          
          // Only alert if there are discrepancies
          if (report.discrepancies.length > 0 || report.orphanPayments.local.length > 0 || report.orphanPayments.stripe.length > 0) {
            await this.sendReconciliationAlert(report);
          }

          // Generate automated report
          await this.generateReconciliationReport('json');

        } catch (error) {
          monitoring.captureException(error as Error, {
            context: 'scheduled_reconciliation'
          });
        }
      }, intervalMs);

      monitoring.captureMessage(
        `Payment reconciliation scheduled every ${intervalHours} hours`,
        'info',
        { intervalHours }
      );

    } catch (error) {
      monitoring.captureException(error as Error, {
        context: 'schedule_reconciliation',
        extra: { intervalHours }
      });
      throw error;
    }
  }

  /**
   * Stop scheduled reconciliation
   */
  public stopScheduledReconciliation(): void {
    if (this.reconciliationScheduler) {
      clearInterval(this.reconciliationScheduler);
      this.reconciliationScheduler = null;
      
      monitoring.captureMessage(
        'Payment reconciliation scheduling stopped',
        'info'
      );
    }
  }

  /**
   * Get reconciliation health status
   */
  public async getReconciliationHealth(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    lastReconciliation?: Date;
    pendingTransactions: number;
    recentDiscrepancies: number;
    checks: Record<string, any>;
  }> {
    try {
      const checks: Record<string, any> = {};
      let status: 'healthy' | 'warning' | 'critical' = 'healthy';

      // Check database connectivity
      await prisma.$queryRaw`SELECT 1`;
      checks.database = { status: 'connected' };

      // Check Stripe API connectivity
      try {
        await stripe.charges.list({ limit: 1 });
        checks.stripe = { status: 'connected' };
      } catch (error) {
        checks.stripe = { 
          status: 'error', 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
        status = 'critical';
      }

      // Count pending transactions
      const pendingCount = await prisma.transaction.count({
        where: {
          status: 'pending',
          isActive: true,
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      });

      // Check for recent discrepancies (last 24 hours)
      const recent24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentReport = await this.reconcileTransactions(recent24h);
      const recentDiscrepancies = recentReport.discrepancies.length;

      if (pendingCount > 100) {
        status = 'warning';
      }

      if (recentDiscrepancies > 10) {
        status = status === 'critical' ? 'critical' : 'warning';
      }

      return {
        status,
        pendingTransactions: pendingCount,
        recentDiscrepancies,
        checks
      };

    } catch (error) {
      monitoring.captureException(error as Error, {
        context: 'reconciliation_health_check'
      });

      return {
        status: 'critical',
        pendingTransactions: -1,
        recentDiscrepancies: -1,
        checks: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }

  // Private helper methods

  private async fetchLocalTransactions(start: Date, end: Date): Promise<LocalTransaction[]> {
    try {
      const transactions = await prisma.transaction.findMany({
        where: {
          createdAt: {
            gte: start,
            lte: end
          },
          isActive: true
        },
        orderBy: {
          createdAt: 'asc'
        }
      });

      return transactions.map(tx => ({
        id: tx.id,
        userId: tx.userId,
        amount: Number(tx.amount),
        currency: tx.currency,
        status: tx.status,
        paymentMethodId: tx.paymentMethodId,
        description: tx.description,
        reference: tx.reference,
        metadata: tx.metadata,
        createdAt: tx.createdAt,
        completedAt: tx.completedAt
      }));

    } catch (error) {
      monitoring.captureException(error as Error, {
        context: 'fetch_local_transactions',
        extra: { start, end }
      });
      throw error;
    }
  }

  private async fetchStripeTransactions(start: Date, end: Date): Promise<StripeTransaction[]> {
    try {
      const stripeTransactions: StripeTransaction[] = [];
      
      // Fetch payment intents
      const paymentIntents = await stripe.paymentIntents.list({
        created: {
          gte: Math.floor(start.getTime() / 1000),
          lte: Math.floor(end.getTime() / 1000)
        },
        limit: 100
      });

      for (const pi of paymentIntents.data) {
        stripeTransactions.push({
          id: pi.id,
          amount: pi.amount,
          currency: pi.currency,
          status: pi.status,
          created: pi.created,
          payment_intent: pi.id,
          payment_method: pi.payment_method as string,
          description: pi.description,
          metadata: pi.metadata,
          customer: pi.customer as string
        });
      }

      // Fetch charges for older payments
      const charges = await stripe.charges.list({
        created: {
          gte: Math.floor(start.getTime() / 1000),
          lte: Math.floor(end.getTime() / 1000)
        },
        limit: 100
      });

      for (const charge of charges.data) {
        // Only add if not already included via payment intent
        const existsInPI = stripeTransactions.some(tx => 
          tx.payment_intent === charge.payment_intent
        );

        if (!existsInPI) {
          stripeTransactions.push({
            id: charge.id,
            amount: charge.amount,
            currency: charge.currency,
            status: charge.status,
            created: charge.created,
            payment_method: charge.payment_method as string,
            description: charge.description,
            metadata: charge.metadata,
            customer: charge.customer as string
          });
        }
      }

      return stripeTransactions;

    } catch (error) {
      monitoring.captureException(error as Error, {
        context: 'fetch_stripe_transactions',
        extra: { start, end }
      });
      throw error;
    }
  }

  private async analyzeTransactions(
    localTransactions: LocalTransaction[],
    stripeTransactions: StripeTransaction[],
    start: Date,
    end: Date
  ): Promise<ReconciliationReport> {
    const reportId = `reconciliation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const discrepancies: ReconciliationDiscrepancy[] = [];
    const orphanLocal: LocalTransaction[] = [];
    const orphanStripe: StripeTransaction[] = [];
    
    let matchedCount = 0;
    let totalAmountLocal = 0;
    let totalAmountStripe = 0;

    // Calculate totals
    totalAmountLocal = localTransactions.reduce((sum, tx) => sum + tx.amount, 0);
    totalAmountStripe = stripeTransactions.reduce((sum, tx) => sum + (tx.amount / 100), 0);

    // Track matched transactions
    const matchedStripeIds = new Set<string>();
    const matchedLocalIds = new Set<string>();

    // Find matches and discrepancies
    for (const localTx of localTransactions) {
      const stripeMatches = stripeTransactions.filter(stripeTx => 
        this.isTransactionMatch(localTx, stripeTx)
      );

      if (stripeMatches.length === 0) {
        orphanLocal.push(localTx);
      } else if (stripeMatches.length === 1) {
        const stripeTx = stripeMatches[0];
        matchedCount++;
        matchedStripeIds.add(stripeTx.id);
        matchedLocalIds.add(localTx.id);

        // Check for discrepancies
        const txDiscrepancies = this.compareTransactions(localTx, stripeTx);
        discrepancies.push(...txDiscrepancies);

      } else {
        // Multiple matches - this is a discrepancy
        discrepancies.push({
          type: 'metadata_mismatch',
          localTransaction: localTx,
          description: `Multiple Stripe transactions match local transaction ${localTx.id}`,
          severity: 'high',
          recommendedAction: 'Investigate duplicate Stripe payments'
        });
      }
    }

    // Find Stripe orphans
    for (const stripeTx of stripeTransactions) {
      if (!matchedStripeIds.has(stripeTx.id)) {
        orphanStripe.push(stripeTx);
      }
    }

    // Generate recommendations
    const recommendations = this.generateRecommendations(discrepancies, orphanLocal, orphanStripe);

    return {
      reportId,
      timestamp: new Date(),
      period: { start, end },
      summary: {
        totalLocalTransactions: localTransactions.length,
        totalStripeTransactions: stripeTransactions.length,
        matchedTransactions: matchedCount,
        discrepancies: discrepancies.length,
        orphanPayments: {
          local: orphanLocal.length,
          stripe: orphanStripe.length
        },
        totalAmountLocal,
        totalAmountStripe,
        amountDiscrepancy: Math.abs(totalAmountLocal - totalAmountStripe)
      },
      discrepancies,
      orphanPayments: {
        local: orphanLocal,
        stripe: orphanStripe
      },
      recommendations
    };
  }

  private isTransactionMatch(local: LocalTransaction, stripe: StripeTransaction): boolean {
    // Check by reference ID first
    if (local.reference === stripe.id || local.reference === stripe.payment_intent) {
      return true;
    }

    // Check by amount and timestamp proximity (within 5 minutes)
    const amountMatch = Math.abs(local.amount - (stripe.amount / 100)) < 0.01;
    const timeMatch = Math.abs(
      local.createdAt.getTime() - (stripe.created * 1000)
    ) < 5 * 60 * 1000; // 5 minutes

    return amountMatch && timeMatch;
  }

  private compareTransactions(
    local: LocalTransaction,
    stripe: StripeTransaction
  ): ReconciliationDiscrepancy[] {
    const discrepancies: ReconciliationDiscrepancy[] = [];

    // Amount comparison
    const localAmount = local.amount;
    const stripeAmount = stripe.amount / 100;
    
    if (Math.abs(localAmount - stripeAmount) > 0.01) {
      discrepancies.push({
        type: 'amount_mismatch',
        localTransaction: local,
        stripeTransaction: stripe,
        description: `Amount mismatch: local=${localAmount}, stripe=${stripeAmount}`,
        severity: 'high',
        recommendedAction: 'Investigate amount discrepancy and correct records'
      });
    }

    // Status comparison
    const localStatus = local.status;
    const stripeStatus = this.mapStripeStatusToLocal(stripe.status);

    if (localStatus !== stripeStatus && this.isStatusDiscrepancySignificant(localStatus, stripeStatus)) {
      discrepancies.push({
        type: 'status_mismatch',
        localTransaction: local,
        stripeTransaction: stripe,
        description: `Status mismatch: local=${localStatus}, stripe=${stripeStatus}`,
        severity: this.getStatusMismatchSeverity(localStatus, stripeStatus),
        recommendedAction: 'Sync transaction status with authoritative source'
      });
    }

    return discrepancies;
  }

  private mapStripeStatusToLocal(stripeStatus: string): string {
    const statusMap: Record<string, string> = {
      'succeeded': 'completed',
      'processing': 'pending',
      'requires_payment_method': 'pending',
      'requires_confirmation': 'pending',
      'requires_action': 'pending',
      'canceled': 'failed',
      'failed': 'failed'
    };

    return statusMap[stripeStatus] || 'pending';
  }

  private isStatusDiscrepancySignificant(local: string, stripe: string): boolean {
    // Some status mismatches are expected during processing
    const allowedMismatches = [
      ['pending', 'completed'], // Local might not be updated yet
      ['completed', 'pending']  // Stripe might be processing
    ];

    return !allowedMismatches.some(([a, b]) => 
      (local === a && stripe === b) || (local === b && stripe === a)
    );
  }

  private getStatusMismatchSeverity(local: string, stripe: string): 'low' | 'medium' | 'high' | 'critical' {
    if (local === 'completed' && stripe === 'failed') return 'critical';
    if (local === 'failed' && stripe === 'completed') return 'critical';
    if (local === 'pending' && stripe === 'failed') return 'high';
    if (local === 'completed' && stripe === 'pending') return 'medium';
    return 'low';
  }

  private generateRecommendations(
    discrepancies: ReconciliationDiscrepancy[],
    orphanLocal: LocalTransaction[],
    orphanStripe: StripeTransaction[]
  ): string[] {
    const recommendations: string[] = [];

    if (discrepancies.length > 0) {
      const criticalCount = discrepancies.filter(d => d.severity === 'critical').length;
      if (criticalCount > 0) {
        recommendations.push(`Immediate attention required: ${criticalCount} critical discrepancies found`);
      }

      const amountMismatches = discrepancies.filter(d => d.type === 'amount_mismatch').length;
      if (amountMismatches > 0) {
        recommendations.push(`Review ${amountMismatches} amount discrepancies for potential fraud or system errors`);
      }
    }

    if (orphanLocal.length > 0) {
      recommendations.push(`Investigate ${orphanLocal.length} local transactions without Stripe records`);
    }

    if (orphanStripe.length > 0) {
      recommendations.push(`Create local records for ${orphanStripe.length} Stripe transactions`);
    }

    if (recommendations.length === 0) {
      recommendations.push('All transactions reconciled successfully');
    }

    return recommendations;
  }

  private async logReconciliationResult(report: ReconciliationReport): Promise<void> {
    try {
      // Log to audit system
      await prisma.auditLog.create({
        data: {
          tableName: 'reconciliation',
          recordId: report.reportId,
          action: 'RECONCILIATION_COMPLETE',
          newValues: {
            summary: report.summary,
            discrepancyCount: report.discrepancies.length,
            timestamp: report.timestamp
          }
        }
      });

    } catch (error) {
      monitoring.captureException(error as Error, {
        context: 'log_reconciliation_result'
      });
    }
  }

  private async handleCriticalDiscrepancies(report: ReconciliationReport): Promise<void> {
    const criticalDiscrepancies = report.discrepancies.filter(d => d.severity === 'critical');
    
    if (criticalDiscrepancies.length > 0) {
      // Create alert
      try {
        await prisma.alert.create({
          data: {
            type: 'reconciliation',
            message: `Critical payment discrepancies detected: ${criticalDiscrepancies.length} issues`,
            severity: 'critical',
            timestamp: new Date(),
            resolved: false,
            metadata: {
              reportId: report.reportId,
              discrepancies: criticalDiscrepancies.map(d => ({
                type: d.type,
                description: d.description,
                severity: d.severity
              }))
            }
          }
        });

        // Send notification (implement based on your notification system)
        monitoring.captureMessage(
          `CRITICAL: Payment reconciliation found ${criticalDiscrepancies.length} critical discrepancies`,
          'error',
          { reportId: report.reportId, discrepancies: criticalDiscrepancies }
        );

      } catch (error) {
        monitoring.captureException(error as Error, {
          context: 'handle_critical_discrepancies'
        });
      }
    }
  }

  private async logTransactionStatusUpdate(
    transactionId: string,
    oldStatus: string,
    newStatus: string,
    source: string
  ): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          tableName: 'transactions',
          recordId: transactionId,
          action: 'STATUS_UPDATE',
          oldValues: { status: oldStatus },
          newValues: { status: newStatus },
          ipAddress: source
        }
      });

    } catch (error) {
      monitoring.captureException(error as Error, {
        context: 'log_transaction_status_update'
      });
    }
  }

  private async sendReconciliationAlert(report: ReconciliationReport): Promise<void> {
    // Implement notification logic based on your system
    // This could send emails, Slack messages, etc.
    monitoring.captureMessage(
      `Reconciliation Alert: ${report.discrepancies.length} discrepancies, ${report.orphanPayments.local.length + report.orphanPayments.stripe.length} orphans`,
      'warning',
      { reportId: report.reportId }
    );
  }

  private convertReportToCSV(report: ReconciliationReport): string {
    const lines: string[] = [];
    
    // Header
    lines.push('Report ID,Timestamp,Period Start,Period End,Local Transactions,Stripe Transactions,Matched,Discrepancies,Local Orphans,Stripe Orphans,Local Amount,Stripe Amount,Amount Discrepancy');
    
    // Summary
    lines.push([
      report.reportId,
      report.timestamp.toISOString(),
      report.period.start.toISOString(),
      report.period.end.toISOString(),
      report.summary.totalLocalTransactions,
      report.summary.totalStripeTransactions,
      report.summary.matchedTransactions,
      report.summary.discrepancies,
      report.summary.orphanPayments.local,
      report.summary.orphanPayments.stripe,
      report.summary.totalAmountLocal,
      report.summary.totalAmountStripe,
      report.summary.amountDiscrepancy
    ].join(','));

    // Discrepancies section
    if (report.discrepancies.length > 0) {
      lines.push('\nDiscrepancies');
      lines.push('Type,Local ID,Stripe ID,Description,Severity,Action');
      
      for (const disc of report.discrepancies) {
        lines.push([
          disc.type,
          disc.localTransaction?.id || '',
          disc.stripeTransaction?.id || '',
          `"${disc.description}"`,
          disc.severity,
          `"${disc.recommendedAction}"`
        ].join(','));
      }
    }

    return lines.join('\n');
  }
}

// Export singleton instance
export const paymentReconciliationService = PaymentReconciliationService.getInstance();

// Export for testing
export { PaymentReconciliationService };