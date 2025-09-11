import { EventEmitter } from 'events';

// Types and Interfaces
export interface TransactionData {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  paymentMethod: string;
  timestamp: Date;
  responseTime?: number;
  errorCode?: string;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export interface AlertData {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  timestamp: Date;
  data: Record<string, any>;
  acknowledged?: boolean;
  resolvedAt?: Date;
}

export type AlertType = 
  | 'high_failure_rate'
  | 'large_transaction'
  | 'multiple_failures'
  | 'volume_spike'
  | 'response_time'
  | 'suspicious_pattern'
  | 'fraud_detection';

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface MetricsData {
  period: string;
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  successRate: number;
  failureRate: number;
  totalVolume: number;
  averageAmount: number;
  averageResponseTime: number;
  peakVolume: number;
  topFailureReasons: Array<{ reason: string; count: number }>;
  hourlyStats: Array<{
    hour: string;
    transactions: number;
    volume: number;
    successRate: number;
  }>;
}

export interface AnomalyDetectionResult {
  isAnomaly: boolean;
  score: number;
  reasons: string[];
  confidence: number;
}

// Configuration
interface MonitoringConfig {
  failureRateThreshold: number;
  largeTransactionThreshold: number;
  multipleFailuresThreshold: number;
  volumeSpikeThreshold: number;
  responseTimeThreshold: number;
  monitoringWindowMinutes: number;
  alertCooldownMinutes: number;
}

const DEFAULT_CONFIG: MonitoringConfig = {
  failureRateThreshold: 10, // 10%
  largeTransactionThreshold: 10000, // $10,000
  multipleFailuresThreshold: 3, // 3 failures per user
  volumeSpikeThreshold: 200, // 200% increase
  responseTimeThreshold: 5000, // 5 seconds
  monitoringWindowMinutes: 15,
  alertCooldownMinutes: 5,
};

export class PaymentMonitoringService extends EventEmitter {
  private transactions: Map<string, TransactionData> = new Map();
  private alerts: Map<string, AlertData> = new Map();
  private userFailures: Map<string, number> = new Map();
  private hourlyVolume: Map<string, number> = new Map();
  private recentAlerts: Map<string, Date> = new Map();
  private config: MonitoringConfig;

  constructor(config?: Partial<MonitoringConfig>) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.startPeriodicChecks();
  }

  /**
   * Track a new transaction
   */
  async trackTransaction(data: TransactionData): Promise<void> {
    try {
      // Store transaction data
      this.transactions.set(data.id, {
        ...data,
        timestamp: new Date(data.timestamp)
      });

      // Update user failure tracking
      if (data.status === 'failed') {
        const currentFailures = this.userFailures.get(data.userId) || 0;
        this.userFailures.set(data.userId, currentFailures + 1);
      } else if (data.status === 'completed') {
        this.userFailures.set(data.userId, 0); // Reset on success
      }

      // Update hourly volume tracking
      const hourKey = this.getHourKey(data.timestamp);
      const currentVolume = this.hourlyVolume.get(hourKey) || 0;
      this.hourlyVolume.set(hourKey, currentVolume + data.amount);

      // Check thresholds immediately
      await this.checkThresholds();

      // Detect anomalies
      const anomalyResult = await this.detectAnomalies();
      if (anomalyResult.isAnomaly && anomalyResult.confidence > 0.7) {
        await this.createAlert('suspicious_pattern', 'high', {
          transactionId: data.id,
          anomalyScore: anomalyResult.score,
          reasons: anomalyResult.reasons,
          confidence: anomalyResult.confidence
        });
      }

      // Emit real-time event
      this.emit('transaction_tracked', data);

    } catch (error) {
      console.error('Error tracking transaction:', error);
      throw error;
    }
  }

  /**
   * Check all monitoring thresholds
   */
  async checkThresholds(): Promise<void> {
    try {
      await Promise.all([
        this.checkFailureRate(),
        this.checkLargeTransactions(),
        this.checkMultipleFailures(),
        this.checkVolumeSpikes(),
        this.checkResponseTimes()
      ]);
    } catch (error) {
      console.error('Error checking thresholds:', error);
    }
  }

  /**
   * Check failure rate threshold
   */
  private async checkFailureRate(): Promise<void> {
    const recentTransactions = this.getRecentTransactions(this.config.monitoringWindowMinutes);
    
    if (recentTransactions.length < 10) return; // Need minimum sample size

    const failedTransactions = recentTransactions.filter(t => t.status === 'failed').length;
    const failureRate = (failedTransactions / recentTransactions.length) * 100;

    if (failureRate > this.config.failureRateThreshold) {
      await this.createAlert('high_failure_rate', 'high', {
        currentRate: failureRate,
        threshold: this.config.failureRateThreshold,
        failedCount: failedTransactions,
        totalCount: recentTransactions.length,
        timeWindow: `${this.config.monitoringWindowMinutes} minutes`
      });
    }
  }

  /**
   * Check for large transactions
   */
  private async checkLargeTransactions(): Promise<void> {
    const recentTransactions = this.getRecentTransactions(5); // Last 5 minutes
    
    for (const transaction of recentTransactions) {
      if (transaction.amount >= this.config.largeTransactionThreshold) {
        await this.createAlert('large_transaction', 'medium', {
          transactionId: transaction.id,
          amount: transaction.amount,
          currency: transaction.currency,
          userId: transaction.userId,
          threshold: this.config.largeTransactionThreshold
        });
      }
    }
  }

  /**
   * Check for multiple failures per user
   */
  private async checkMultipleFailures(): Promise<void> {
    const entries = Array.from(this.userFailures.entries());
    for (const [userId, failureCount] of entries) {
      if (failureCount >= this.config.multipleFailuresThreshold) {
        await this.createAlert('multiple_failures', 'medium', {
          userId,
          failureCount,
          threshold: this.config.multipleFailuresThreshold
        });
        
        // Reset counter to avoid spam
        this.userFailures.set(userId, 0);
      }
    }
  }

  /**
   * Check for volume spikes
   */
  private async checkVolumeSpikes(): Promise<void> {
    const currentHour = this.getHourKey(new Date());
    const previousHour = this.getHourKey(new Date(Date.now() - 60 * 60 * 1000));
    
    const currentVolume = this.hourlyVolume.get(currentHour) || 0;
    const previousVolume = this.hourlyVolume.get(previousHour) || 0;

    if (previousVolume > 0) {
      const increasePercent = ((currentVolume - previousVolume) / previousVolume) * 100;
      
      if (increasePercent > this.config.volumeSpikeThreshold) {
        await this.createAlert('volume_spike', 'medium', {
          currentVolume,
          previousVolume,
          increasePercent,
          threshold: this.config.volumeSpikeThreshold
        });
      }
    }
  }

  /**
   * Check response times
   */
  private async checkResponseTimes(): Promise<void> {
    const recentTransactions = this.getRecentTransactions(this.config.monitoringWindowMinutes)
      .filter(t => t.responseTime !== undefined);

    if (recentTransactions.length === 0) return;

    const averageResponseTime = recentTransactions.reduce((sum, t) => 
      sum + (t.responseTime || 0), 0) / recentTransactions.length;

    if (averageResponseTime > this.config.responseTimeThreshold) {
      await this.createAlert('response_time', 'medium', {
        averageResponseTime,
        threshold: this.config.responseTimeThreshold,
        sampleSize: recentTransactions.length,
        timeWindow: `${this.config.monitoringWindowMinutes} minutes`
      });
    }
  }

  /**
   * Create an alert
   */
  async createAlert(type: AlertType, severity: AlertSeverity, data: Record<string, any>): Promise<AlertData> {
    // Check alert cooldown to prevent spam
    const alertKey = `${type}_${JSON.stringify(data)}`;
    const lastAlert = this.recentAlerts.get(alertKey);
    const now = new Date();
    
    if (lastAlert && (now.getTime() - lastAlert.getTime()) < (this.config.alertCooldownMinutes * 60 * 1000)) {
      return this.alerts.get(alertKey)!;
    }

    const alert: AlertData = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      severity,
      title: this.getAlertTitle(type, severity),
      message: this.getAlertMessage(type, data),
      timestamp: now,
      data,
      acknowledged: false
    };

    // Store alert
    this.alerts.set(alert.id, alert);
    this.recentAlerts.set(alertKey, now);

    // Emit real-time event
    this.emit('alert_created', alert);

    console.log(`🚨 Alert created: ${alert.title} - ${alert.message}`);

    return alert;
  }

  /**
   * Get metrics for a specific period
   */
  async getMetrics(period: '1h' | '24h' | '7d' | '30d' = '24h'): Promise<MetricsData> {
    const periodMinutes = this.getPeriodMinutes(period);
    const transactions = this.getRecentTransactions(periodMinutes);

    const totalTransactions = transactions.length;
    const successfulTransactions = transactions.filter(t => t.status === 'completed').length;
    const failedTransactions = transactions.filter(t => t.status === 'failed').length;
    const successRate = totalTransactions > 0 ? (successfulTransactions / totalTransactions) * 100 : 0;
    const failureRate = totalTransactions > 0 ? (failedTransactions / totalTransactions) * 100 : 0;
    const totalVolume = transactions.reduce((sum, t) => sum + t.amount, 0);
    const averageAmount = totalTransactions > 0 ? totalVolume / totalTransactions : 0;

    // Calculate average response time
    const transactionsWithResponseTime = transactions.filter(t => t.responseTime !== undefined);
    const averageResponseTime = transactionsWithResponseTime.length > 0 
      ? transactionsWithResponseTime.reduce((sum, t) => sum + (t.responseTime || 0), 0) / transactionsWithResponseTime.length
      : 0;

    // Calculate peak volume
    const hourlyVolumes = Array.from(this.hourlyVolume.values());
    const peakVolume = Math.max(...hourlyVolumes, 0);

    // Top failure reasons
    const failureReasons = new Map<string, number>();
    transactions.filter(t => t.status === 'failed').forEach(t => {
      const reason = t.errorMessage || t.errorCode || 'Unknown';
      failureReasons.set(reason, (failureReasons.get(reason) || 0) + 1);
    });

    const topFailureReasons = Array.from(failureReasons.entries())
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Hourly stats
    const hourlyStats = this.generateHourlyStats(transactions, periodMinutes);

    return {
      period,
      totalTransactions,
      successfulTransactions,
      failedTransactions,
      successRate,
      failureRate,
      totalVolume,
      averageAmount,
      averageResponseTime,
      peakVolume,
      topFailureReasons,
      hourlyStats
    };
  }

  /**
   * Basic ML-based anomaly detection
   */
  async detectAnomalies(): Promise<AnomalyDetectionResult> {
    const recentTransactions = this.getRecentTransactions(60); // Last hour
    
    if (recentTransactions.length < 10) {
      return { isAnomaly: false, score: 0, reasons: [], confidence: 0 };
    }

    let anomalyScore = 0;
    const reasons: string[] = [];

    // Check transaction amount patterns
    const amounts = recentTransactions.map(t => t.amount);
    const meanAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const stdAmount = Math.sqrt(amounts.reduce((sum, amount) => sum + Math.pow(amount - meanAmount, 2), 0) / amounts.length);
    
    const unusualAmounts = amounts.filter(amount => Math.abs(amount - meanAmount) > 2 * stdAmount);
    if (unusualAmounts.length > 0) {
      anomalyScore += 0.3;
      reasons.push(`Unusual transaction amounts detected: ${unusualAmounts.length} outliers`);
    }

    // Check time patterns
    const timeIntervals = [];
    for (let i = 1; i < recentTransactions.length; i++) {
      const interval = recentTransactions[i].timestamp.getTime() - recentTransactions[i-1].timestamp.getTime();
      timeIntervals.push(interval);
    }

    if (timeIntervals.length > 0) {
      const meanInterval = timeIntervals.reduce((a, b) => a + b, 0) / timeIntervals.length;
      const shortIntervals = timeIntervals.filter(interval => interval < meanInterval / 10);
      
      if (shortIntervals.length > 3) {
        anomalyScore += 0.4;
        reasons.push(`Rapid-fire transactions detected: ${shortIntervals.length} very short intervals`);
      }
    }

    // Check failure patterns
    const recentFailures = recentTransactions.filter(t => t.status === 'failed');
    if (recentFailures.length > recentTransactions.length * 0.3) {
      anomalyScore += 0.5;
      reasons.push(`High failure rate: ${(recentFailures.length / recentTransactions.length * 100).toFixed(1)}%`);
    }

    // Check user patterns
    const userCounts = new Map<string, number>();
    recentTransactions.forEach(t => {
      userCounts.set(t.userId, (userCounts.get(t.userId) || 0) + 1);
    });

    const highVolumeUsers = Array.from(userCounts.entries()).filter(([_, count]) => count > 10);
    if (highVolumeUsers.length > 0) {
      anomalyScore += 0.3;
      reasons.push(`High-volume users detected: ${highVolumeUsers.length} users with >10 transactions`);
    }

    const isAnomaly = anomalyScore > 0.5;
    const confidence = Math.min(anomalyScore, 1.0);

    return { isAnomaly, score: anomalyScore, reasons, confidence };
  }

  /**
   * Get all active alerts
   */
  getActiveAlerts(): AlertData[] {
    return Array.from(this.alerts.values())
      .filter(alert => !alert.acknowledged)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.acknowledged = true;
      this.emit('alert_acknowledged', alert);
      return true;
    }
    return false;
  }

  /**
   * Get WebSocket updates for real-time monitoring
   */
  getRealtimeUpdates(): any {
    return {
      onTransaction: (callback: (data: TransactionData) => void) => {
        this.on('transaction_tracked', callback);
      },
      onAlert: (callback: (alert: AlertData) => void) => {
        this.on('alert_created', callback);
      },
      onMetricsUpdate: (callback: (metrics: MetricsData) => void) => {
        this.on('metrics_updated', callback);
      }
    };
  }

  // Helper methods
  private getRecentTransactions(minutes: number): TransactionData[] {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    return Array.from(this.transactions.values())
      .filter(t => t.timestamp >= cutoff)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  private getHourKey(date: Date | string): string {
    const d = new Date(date);
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}`;
  }

  private getPeriodMinutes(period: string): number {
    switch (period) {
      case '1h': return 60;
      case '24h': return 24 * 60;
      case '7d': return 7 * 24 * 60;
      case '30d': return 30 * 24 * 60;
      default: return 24 * 60;
    }
  }

  private getAlertTitle(type: AlertType, severity: AlertSeverity): string {
    const titles: Record<AlertType, string> = {
      high_failure_rate: 'High Transaction Failure Rate',
      large_transaction: 'Large Transaction Detected',
      multiple_failures: 'Multiple User Failures',
      volume_spike: 'Transaction Volume Spike',
      response_time: 'Slow Response Times',
      suspicious_pattern: 'Suspicious Transaction Pattern',
      fraud_detection: 'Potential Fraud Detected'
    };
    return `${severity.toUpperCase()}: ${titles[type]}`;
  }

  private getAlertMessage(type: AlertType, data: Record<string, any>): string {
    switch (type) {
      case 'high_failure_rate':
        return `Failure rate is ${data.currentRate.toFixed(1)}% (threshold: ${data.threshold}%) over ${data.timeWindow}`;
      case 'large_transaction':
        return `Transaction ${data.transactionId} for ${data.currency} ${data.amount} exceeds threshold of ${data.threshold}`;
      case 'multiple_failures':
        return `User ${data.userId} has ${data.failureCount} consecutive failures`;
      case 'volume_spike':
        return `Volume increased by ${data.increasePercent.toFixed(1)}% (threshold: ${data.threshold}%)`;
      case 'response_time':
        return `Average response time is ${data.averageResponseTime.toFixed(0)}ms (threshold: ${data.threshold}ms)`;
      case 'suspicious_pattern':
        return `Anomaly detected with ${(data.confidence * 100).toFixed(1)}% confidence: ${data.reasons.join(', ')}`;
      case 'fraud_detection':
        return `Potential fraud detected in transaction ${data.transactionId}`;
      default:
        return 'Alert triggered';
    }
  }

  private generateHourlyStats(transactions: TransactionData[], periodMinutes: number): any[] {
    const hourlyData = new Map<string, { transactions: number; volume: number; successful: number }>();
    
    transactions.forEach(t => {
      const hourKey = this.getHourKey(t.timestamp);
      const current = hourlyData.get(hourKey) || { transactions: 0, volume: 0, successful: 0 };
      
      current.transactions++;
      current.volume += t.amount;
      if (t.status === 'completed') current.successful++;
      
      hourlyData.set(hourKey, current);
    });

    return Array.from(hourlyData.entries()).map(([hour, data]) => ({
      hour,
      transactions: data.transactions,
      volume: data.volume,
      successRate: data.transactions > 0 ? (data.successful / data.transactions) * 100 : 0
    }));
  }

  private startPeriodicChecks(): void {
    // Check thresholds every 2 minutes
    setInterval(() => {
      this.checkThresholds().catch(console.error);
    }, 2 * 60 * 1000);

    // Emit metrics update every 5 minutes
    setInterval(async () => {
      try {
        const metrics = await this.getMetrics('1h');
        this.emit('metrics_updated', metrics);
      } catch (error) {
        console.error('Error updating metrics:', error);
      }
    }, 5 * 60 * 1000);

    // Clean old data every hour
    setInterval(() => {
      this.cleanOldData();
    }, 60 * 60 * 1000);
  }

  private cleanOldData(): void {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    
    // Clean old transactions
    const transactionEntries = Array.from(this.transactions.entries());
    for (const [id, transaction] of transactionEntries) {
      if (transaction.timestamp < cutoff) {
        this.transactions.delete(id);
      }
    }

    // Clean old hourly volume data
    const volumeEntries = Array.from(this.hourlyVolume.entries());
    for (const [hour, _] of volumeEntries) {
      const [year, month, day, hourNum] = hour.split('-').map(Number);
      const hourDate = new Date(year, month, day, hourNum);
      if (hourDate < cutoff) {
        this.hourlyVolume.delete(hour);
      }
    }

    // Clean old alerts (keep for 7 days)
    const alertCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const alertEntries = Array.from(this.alerts.entries());
    for (const [id, alert] of alertEntries) {
      if (alert.timestamp < alertCutoff && alert.acknowledged) {
        this.alerts.delete(id);
      }
    }
  }
}

// Singleton instance
export const paymentMonitor = new PaymentMonitoringService();