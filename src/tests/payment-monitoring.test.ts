import { PaymentMonitoringService } from '../services/payment-monitoring';

describe('PaymentMonitoringService', () => {
  let monitor: PaymentMonitoringService;

  beforeEach(() => {
    monitor = new PaymentMonitoringService({
      failureRateThreshold: 10,
      largeTransactionThreshold: 1000,
      multipleFailuresThreshold: 3,
      volumeSpikeThreshold: 200,
      responseTimeThreshold: 5000,
      monitoringWindowMinutes: 15,
      alertCooldownMinutes: 5,
    });
  });

  afterEach(() => {
    // Clean up any intervals or listeners
    monitor.removeAllListeners();
  });

  test('should track successful transaction', async () => {
    const transaction = {
      id: 'tx_test_001',
      userId: 'user_001',
      amount: 100.50,
      currency: 'USD',
      status: 'completed' as const,
      paymentMethod: 'stripe',
      timestamp: new Date(),
      responseTime: 1200
    };

    await monitor.trackTransaction(transaction);
    
    const metrics = await monitor.getMetrics('1h');
    expect(metrics.totalTransactions).toBe(1);
    expect(metrics.successfulTransactions).toBe(1);
    expect(metrics.successRate).toBe(100);
  });

  test('should track failed transaction', async () => {
    const transaction = {
      id: 'tx_test_002',
      userId: 'user_002',
      amount: 250.00,
      currency: 'USD',
      status: 'failed' as const,
      paymentMethod: 'paypal',
      timestamp: new Date(),
      errorCode: 'insufficient_funds',
      errorMessage: 'Insufficient funds'
    };

    await monitor.trackTransaction(transaction);
    
    const metrics = await monitor.getMetrics('1h');
    expect(metrics.totalTransactions).toBe(1);
    expect(metrics.failedTransactions).toBe(1);
    expect(metrics.failureRate).toBe(100);
  });

  test('should create alert for large transaction', async () => {
    const transaction = {
      id: 'tx_test_003',
      userId: 'user_003',
      amount: 15000, // Above threshold
      currency: 'USD',
      status: 'completed' as const,
      paymentMethod: 'bank_transfer',
      timestamp: new Date()
    };

    await monitor.trackTransaction(transaction);
    
    const alerts = monitor.getActiveAlerts();
    expect(alerts).toHaveLength(1);
    expect(alerts[0].type).toBe('large_transaction');
    expect(alerts[0].severity).toBe('medium');
  });

  test('should create alert for high failure rate', async () => {
    // Create 5 successful transactions
    for (let i = 0; i < 5; i++) {
      await monitor.trackTransaction({
        id: `tx_success_${i}`,
        userId: `user_${i}`,
        amount: 100,
        currency: 'USD',
        status: 'completed' as const,
        paymentMethod: 'stripe',
        timestamp: new Date()
      });
    }

    // Create 5 failed transactions (failure rate = 50% > 10% threshold)
    for (let i = 0; i < 5; i++) {
      await monitor.trackTransaction({
        id: `tx_failed_${i}`,
        userId: `user_${i + 10}`,
        amount: 100,
        currency: 'USD',
        status: 'failed' as const,
        paymentMethod: 'stripe',
        timestamp: new Date(),
        errorCode: 'card_declined'
      });
    }

    // Wait for threshold check
    await monitor.checkThresholds();

    const alerts = monitor.getActiveAlerts();
    const failureAlert = alerts.find(alert => alert.type === 'high_failure_rate');
    expect(failureAlert).toBeTruthy();
    expect(failureAlert?.severity).toBe('high');
  });

  test('should create alert for multiple user failures', async () => {
    const userId = 'user_problem';

    // Create 4 failed transactions for same user
    for (let i = 0; i < 4; i++) {
      await monitor.trackTransaction({
        id: `tx_fail_${i}`,
        userId,
        amount: 100,
        currency: 'USD',
        status: 'failed' as const,
        paymentMethod: 'stripe',
        timestamp: new Date(),
        errorCode: 'card_declined'
      });
    }

    await monitor.checkThresholds();

    const alerts = monitor.getActiveAlerts();
    const multipleFailuresAlert = alerts.find(alert => alert.type === 'multiple_failures');
    expect(multipleFailuresAlert).toBeTruthy();
    expect(multipleFailuresAlert?.data.userId).toBe(userId);
  });

  test('should acknowledge alerts', () => {
    // Create a mock alert
    const alertId = 'test_alert_001';
    const alert = {
      id: alertId,
      type: 'large_transaction' as const,
      severity: 'medium' as const,
      title: 'Test Alert',
      message: 'Test message',
      timestamp: new Date(),
      data: { test: true },
      acknowledged: false
    };

    // Manually add alert to test acknowledgment
    (monitor as any).alerts.set(alertId, alert);

    expect(monitor.getActiveAlerts()).toHaveLength(1);

    const success = monitor.acknowledgeAlert(alertId);
    expect(success).toBe(true);
    expect(monitor.getActiveAlerts()).toHaveLength(0);
  });

  test('should detect anomalies in transaction patterns', async () => {
    // Create normal transactions
    for (let i = 0; i < 15; i++) {
      await monitor.trackTransaction({
        id: `tx_normal_${i}`,
        userId: `user_${i}`,
        amount: 100 + (Math.random() * 50), // $100-150
        currency: 'USD',
        status: 'completed' as const,
        paymentMethod: 'stripe',
        timestamp: new Date(Date.now() - (i * 60000)) // 1 minute apart
      });
    }

    // Create very anomalous pattern: rapid-fire large amounts with failures
    for (let i = 0; i < 8; i++) {
      await monitor.trackTransaction({
        id: `tx_anomaly_${i}`,
        userId: `user_anomaly_${i}`,
        amount: 100000, // Very large amounts
        currency: 'USD',
        status: 'failed' as const, // High failure rate
        paymentMethod: 'stripe',
        timestamp: new Date(Date.now() - (i * 1000)), // 1 second apart (rapid-fire)
        errorCode: 'card_declined'
      });
    }

    // Add some rapid-fire transactions from same user
    for (let i = 0; i < 15; i++) {
      await monitor.trackTransaction({
        id: `tx_rapid_${i}`,
        userId: 'user_suspicious', // Same user many times
        amount: 50000,
        currency: 'USD',
        status: 'completed' as const,
        paymentMethod: 'stripe',
        timestamp: new Date(Date.now() - (i * 500)) // Very rapid
      });
    }

    const anomalies = await monitor.detectAnomalies();
    expect(anomalies.score).toBeGreaterThan(0.3);
    expect(anomalies.reasons.length).toBeGreaterThan(0);
    
    // Should have detected at least some suspicious patterns
    expect(anomalies.reasons.some(reason => 
      reason.includes('Unusual transaction amounts') ||
      reason.includes('Rapid-fire transactions') ||
      reason.includes('High failure rate') ||
      reason.includes('High-volume users')
    )).toBe(true);
  });

  test('should get comprehensive metrics', async () => {
    // Create diverse transaction data
    const transactions = [
      { status: 'completed', amount: 100, errorCode: null },
      { status: 'completed', amount: 200, errorCode: null },
      { status: 'failed', amount: 150, errorCode: 'card_declined' },
      { status: 'completed', amount: 300, errorCode: null },
      { status: 'failed', amount: 100, errorCode: 'insufficient_funds' },
    ];

    for (let i = 0; i < transactions.length; i++) {
      const tx = transactions[i];
      await monitor.trackTransaction({
        id: `tx_metrics_${i}`,
        userId: `user_${i}`,
        amount: tx.amount,
        currency: 'USD',
        status: tx.status as 'completed' | 'failed',
        paymentMethod: 'stripe',
        timestamp: new Date(),
        ...(tx.errorCode && { errorCode: tx.errorCode })
      });
    }

    const metrics = await monitor.getMetrics('1h');
    
    expect(metrics.totalTransactions).toBe(5);
    expect(metrics.successfulTransactions).toBe(3);
    expect(metrics.failedTransactions).toBe(2);
    expect(metrics.successRate).toBe(60);
    expect(metrics.failureRate).toBe(40);
    expect(metrics.totalVolume).toBe(850);
    expect(metrics.averageAmount).toBe(170);
    expect(metrics.topFailureReasons).toHaveLength(2);
  });

  test('should handle real-time events', (done) => {
    let transactionEventReceived = false;
    let alertEventReceived = false;

    monitor.on('transaction_tracked', (transaction) => {
      expect(transaction.id).toBe('tx_realtime_001');
      transactionEventReceived = true;
      checkComplete();
    });

    monitor.on('alert_created', (alert) => {
      expect(alert.type).toBe('large_transaction');
      alertEventReceived = true;
      checkComplete();
    });

    function checkComplete() {
      if (transactionEventReceived && alertEventReceived) {
        done();
      }
    }

    // Track a large transaction that should trigger both events
    monitor.trackTransaction({
      id: 'tx_realtime_001',
      userId: 'user_realtime',
      amount: 15000, // Large amount to trigger alert
      currency: 'USD',
      status: 'completed' as const,
      paymentMethod: 'stripe',
      timestamp: new Date()
    });
  });
});