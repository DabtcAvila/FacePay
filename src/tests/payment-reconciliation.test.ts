import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { PaymentReconciliationService } from '../services/payment-reconciliation';
import { prisma } from '../lib/prisma';
import { monitoring } from '../lib/monitoring';
import Stripe from 'stripe';

// Mock dependencies
jest.mock('../lib/prisma');
jest.mock('../lib/monitoring');
jest.mock('stripe');

// Mock file system operations
jest.mock('fs', () => ({
  existsSync: jest.fn(() => true),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
}));

// Mock Stripe
const mockStripe = {
  paymentIntents: {
    list: jest.fn(),
    retrieve: jest.fn(),
  },
  charges: {
    list: jest.fn(),
    retrieve: jest.fn(),
  },
} as unknown as Stripe;

jest.mocked(Stripe).mockImplementation(() => mockStripe);

describe('PaymentReconciliationService', () => {
  let service: PaymentReconciliationService;
  let mockPrisma: any;
  let mockMonitoring: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    service = PaymentReconciliationService.getInstance();
    mockPrisma = jest.mocked(prisma);
    mockMonitoring = jest.mocked(monitoring);

    // Setup default mock responses
    mockPrisma.transaction = {
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    };

    mockPrisma.auditLog = {
      create: jest.fn(),
    };

    mockPrisma.alert = {
      create: jest.fn(),
    };

    mockPrisma.$queryRaw = jest.fn().mockResolvedValue([{ '?column?': 1 }]);

    mockMonitoring.addBreadcrumb = jest.fn();
    mockMonitoring.trackPerformanceMetric = jest.fn();
    mockMonitoring.captureMessage = jest.fn();
    mockMonitoring.captureException = jest.fn();
  });

  afterEach(() => {
    // Clean up any scheduled reconciliation
    service.stopScheduledReconciliation();
  });

  describe('reconcileTransactions', () => {
    it('should successfully reconcile matching transactions', async () => {
      // Mock local transactions
      const localTransactions = [
        {
          id: 'local_1',
          userId: 'user_1',
          amount: 100.00,
          currency: 'USD',
          status: 'completed',
          paymentMethodId: 'pm_1',
          reference: 'pi_stripe_1',
          createdAt: new Date('2024-01-01T10:00:00Z'),
          completedAt: new Date('2024-01-01T10:01:00Z'),
          description: 'Test payment',
          metadata: null,
        }
      ];

      // Mock Stripe transactions
      const stripePaymentIntents = {
        data: [
          {
            id: 'pi_stripe_1',
            amount: 10000, // $100 in cents
            currency: 'usd',
            status: 'succeeded',
            created: Math.floor(new Date('2024-01-01T10:00:00Z').getTime() / 1000),
            description: 'Test payment',
            metadata: {},
            customer: 'cus_1',
            payment_method: 'pm_stripe_1',
          }
        ]
      };

      mockPrisma.transaction.findMany.mockResolvedValue(localTransactions.map(tx => ({
        ...tx,
        amount: tx.amount.toString(), // Prisma Decimal to string
      })));

      mockStripe.paymentIntents.list.mockResolvedValue(stripePaymentIntents);
      mockStripe.charges.list.mockResolvedValue({ data: [] });

      const result = await service.reconcileTransactions(
        new Date('2024-01-01T00:00:00Z'),
        new Date('2024-01-01T23:59:59Z')
      );

      expect(result).toBeDefined();
      expect(result.summary.totalLocalTransactions).toBe(1);
      expect(result.summary.totalStripeTransactions).toBe(1);
      expect(result.summary.matchedTransactions).toBe(1);
      expect(result.discrepancies).toHaveLength(0);
      expect(result.orphanPayments.local).toHaveLength(0);
      expect(result.orphanPayments.stripe).toHaveLength(0);

      // Verify monitoring calls
      expect(mockMonitoring.addBreadcrumb).toHaveBeenCalledWith(
        'Starting payment reconciliation',
        'reconciliation',
        'info',
        expect.any(Object)
      );
      expect(mockMonitoring.trackPerformanceMetric).toHaveBeenCalled();
    });

    it('should detect amount discrepancies', async () => {
      const localTransactions = [
        {
          id: 'local_1',
          userId: 'user_1',
          amount: 100.00,
          currency: 'USD',
          status: 'completed',
          paymentMethodId: 'pm_1',
          reference: 'pi_stripe_1',
          createdAt: new Date('2024-01-01T10:00:00Z'),
          completedAt: new Date('2024-01-01T10:01:00Z'),
          description: 'Test payment',
          metadata: null,
        }
      ];

      const stripePaymentIntents = {
        data: [
          {
            id: 'pi_stripe_1',
            amount: 9500, // $95 in cents - different amount
            currency: 'usd',
            status: 'succeeded',
            created: Math.floor(new Date('2024-01-01T10:00:00Z').getTime() / 1000),
            description: 'Test payment',
            metadata: {},
            customer: 'cus_1',
            payment_method: 'pm_stripe_1',
          }
        ]
      };

      mockPrisma.transaction.findMany.mockResolvedValue(localTransactions.map(tx => ({
        ...tx,
        amount: tx.amount.toString(),
      })));

      mockStripe.paymentIntents.list.mockResolvedValue(stripePaymentIntents);
      mockStripe.charges.list.mockResolvedValue({ data: [] });

      const result = await service.reconcileTransactions(
        new Date('2024-01-01T00:00:00Z'),
        new Date('2024-01-01T23:59:59Z')
      );

      expect(result.discrepancies).toHaveLength(1);
      expect(result.discrepancies[0].type).toBe('amount_mismatch');
      expect(result.discrepancies[0].severity).toBe('high');
    });

    it('should detect orphan local transactions', async () => {
      const localTransactions = [
        {
          id: 'local_orphan',
          userId: 'user_1',
          amount: 50.00,
          currency: 'USD',
          status: 'completed',
          paymentMethodId: 'pm_1',
          reference: null,
          createdAt: new Date('2024-01-01T10:00:00Z'),
          completedAt: new Date('2024-01-01T10:01:00Z'),
          description: 'Orphan payment',
          metadata: null,
        }
      ];

      mockPrisma.transaction.findMany.mockResolvedValue(localTransactions.map(tx => ({
        ...tx,
        amount: tx.amount.toString(),
      })));

      mockStripe.paymentIntents.list.mockResolvedValue({ data: [] });
      mockStripe.charges.list.mockResolvedValue({ data: [] });

      const result = await service.reconcileTransactions(
        new Date('2024-01-01T00:00:00Z'),
        new Date('2024-01-01T23:59:59Z')
      );

      expect(result.orphanPayments.local).toHaveLength(1);
      expect(result.orphanPayments.local[0].id).toBe('local_orphan');
      expect(result.summary.matchedTransactions).toBe(0);
    });

    it('should detect orphan Stripe transactions', async () => {
      const stripePaymentIntents = {
        data: [
          {
            id: 'pi_stripe_orphan',
            amount: 7500, // $75 in cents
            currency: 'usd',
            status: 'succeeded',
            created: Math.floor(new Date('2024-01-01T10:00:00Z').getTime() / 1000),
            description: 'Orphan Stripe payment',
            metadata: {},
            customer: 'cus_1',
            payment_method: 'pm_stripe_1',
          }
        ]
      };

      mockPrisma.transaction.findMany.mockResolvedValue([]);
      mockStripe.paymentIntents.list.mockResolvedValue(stripePaymentIntents);
      mockStripe.charges.list.mockResolvedValue({ data: [] });

      const result = await service.reconcileTransactions(
        new Date('2024-01-01T00:00:00Z'),
        new Date('2024-01-01T23:59:59Z')
      );

      expect(result.orphanPayments.stripe).toHaveLength(1);
      expect(result.orphanPayments.stripe[0].id).toBe('pi_stripe_orphan');
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('Database connection failed');
      mockPrisma.transaction.findMany.mockRejectedValue(error);

      await expect(
        service.reconcileTransactions(
          new Date('2024-01-01T00:00:00Z'),
          new Date('2024-01-01T23:59:59Z')
        )
      ).rejects.toThrow('Database connection failed');

      expect(mockMonitoring.captureException).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          context: 'payment_reconciliation'
        })
      );
    });
  });

  describe('detectOrphanPayments', () => {
    it('should identify orphan payments correctly', async () => {
      const localTransactions = [
        {
          id: 'local_1',
          userId: 'user_1',
          amount: 100.00,
          currency: 'USD',
          status: 'completed',
          paymentMethodId: 'pm_1',
          reference: null,
          createdAt: new Date('2024-01-01T10:00:00Z'),
          completedAt: new Date('2024-01-01T10:01:00Z'),
          description: 'Local only payment',
          metadata: null,
        }
      ];

      const stripePaymentIntents = {
        data: [
          {
            id: 'pi_stripe_1',
            amount: 12500, // $125 in cents
            currency: 'usd',
            status: 'succeeded',
            created: Math.floor(new Date('2024-01-01T11:00:00Z').getTime() / 1000),
            description: 'Stripe only payment',
            metadata: {},
            customer: 'cus_1',
            payment_method: 'pm_stripe_1',
          }
        ]
      };

      mockPrisma.transaction.findMany.mockResolvedValue(localTransactions.map(tx => ({
        ...tx,
        amount: tx.amount.toString(),
      })));

      mockStripe.paymentIntents.list.mockResolvedValue(stripePaymentIntents);
      mockStripe.charges.list.mockResolvedValue({ data: [] });

      const orphans = await service.detectOrphanPayments(
        new Date('2024-01-01T00:00:00Z'),
        new Date('2024-01-01T23:59:59Z')
      );

      expect(orphans).toHaveLength(2);
      expect(orphans.find(o => o.type === 'local')).toBeDefined();
      expect(orphans.find(o => o.type === 'stripe')).toBeDefined();

      const localOrphan = orphans.find(o => o.type === 'local')!;
      expect(localOrphan.id).toBe('local_1');
      expect(localOrphan.reason).toBe('No corresponding Stripe transaction found');

      const stripeOrphan = orphans.find(o => o.type === 'stripe')!;
      expect(stripeOrphan.id).toBe('pi_stripe_1');
      expect(stripeOrphan.reason).toBe('No corresponding local transaction found');
    });
  });

  describe('syncPendingPayments', () => {
    it('should update pending transactions to completed when Stripe shows success', async () => {
      const pendingTransactions = [
        {
          id: 'pending_1',
          userId: 'user_1',
          amount: '100.00',
          currency: 'USD',
          status: 'pending',
          paymentMethodId: 'pm_1',
          reference: 'pi_stripe_1',
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          user: { id: 'user_1', email: 'test@example.com' },
          paymentMethod: { id: 'pm_1', type: 'card' },
        }
      ];

      const stripePaymentIntent = {
        id: 'pi_stripe_1',
        status: 'succeeded',
        amount: 10000,
        currency: 'usd',
      };

      mockPrisma.transaction.findMany.mockResolvedValue(pendingTransactions);
      mockPrisma.transaction.update.mockResolvedValue({ id: 'pending_1' });
      mockStripe.paymentIntents.retrieve.mockResolvedValue(stripePaymentIntent);

      const result = await service.syncPendingPayments();

      expect(result.updated).toBe(1);
      expect(result.errors).toHaveLength(0);

      expect(mockPrisma.transaction.update).toHaveBeenCalledWith({
        where: { id: 'pending_1' },
        data: {
          status: 'completed',
          completedAt: expect.any(Date),
          updatedAt: expect.any(Date)
        }
      });
    });

    it('should mark old pending transactions as failed', async () => {
      const oldPendingTransactions = [
        {
          id: 'old_pending_1',
          userId: 'user_1',
          amount: '50.00',
          currency: 'USD',
          status: 'pending',
          paymentMethodId: 'pm_1',
          reference: 'pi_nonexistent',
          createdAt: new Date(Date.now() - 30 * 60 * 60 * 1000), // 30 hours ago
          user: { id: 'user_1', email: 'test@example.com' },
          paymentMethod: { id: 'pm_1', type: 'card' },
        }
      ];

      mockPrisma.transaction.findMany.mockResolvedValue(oldPendingTransactions);
      mockPrisma.transaction.update.mockResolvedValue({ id: 'old_pending_1' });
      mockStripe.paymentIntents.retrieve.mockRejectedValue(new Error('Not found'));
      mockStripe.charges.retrieve.mockRejectedValue(new Error('Not found'));

      const result = await service.syncPendingPayments();

      expect(result.updated).toBe(1);
      expect(mockPrisma.transaction.update).toHaveBeenCalledWith({
        where: { id: 'old_pending_1' },
        data: {
          status: 'failed',
          updatedAt: expect.any(Date)
        }
      });
    });

    it('should handle errors during sync gracefully', async () => {
      const pendingTransactions = [
        {
          id: 'error_transaction',
          userId: 'user_1',
          amount: '75.00',
          currency: 'USD',
          status: 'pending',
          paymentMethodId: 'pm_1',
          reference: 'pi_error',
          createdAt: new Date(),
          user: { id: 'user_1', email: 'test@example.com' },
          paymentMethod: { id: 'pm_1', type: 'card' },
        }
      ];

      mockPrisma.transaction.findMany.mockResolvedValue(pendingTransactions);
      mockPrisma.transaction.update.mockRejectedValue(new Error('Update failed'));
      mockStripe.paymentIntents.retrieve.mockResolvedValue({
        id: 'pi_error',
        status: 'succeeded',
        amount: 7500,
        currency: 'usd',
      });

      const result = await service.syncPendingPayments();

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].id).toBe('error_transaction');
      expect(result.errors[0].error).toBe('Update failed');
    });
  });

  describe('scheduleReconciliation', () => {
    it('should schedule reconciliation at specified intervals', async () => {
      jest.useFakeTimers();

      // Mock successful reconciliation
      mockPrisma.transaction.findMany.mockResolvedValue([]);
      mockStripe.paymentIntents.list.mockResolvedValue({ data: [] });
      mockStripe.charges.list.mockResolvedValue({ data: [] });

      service.scheduleReconciliation(2); // Every 2 hours

      // Fast forward 2 hours
      jest.advanceTimersByTime(2 * 60 * 60 * 1000);

      // Wait for async operations
      await new Promise(resolve => setImmediate(resolve));

      expect(mockMonitoring.addBreadcrumb).toHaveBeenCalledWith(
        'Scheduled reconciliation starting',
        'reconciliation',
        'info'
      );

      jest.useRealTimers();
    });

    it('should stop scheduled reconciliation when requested', () => {
      service.scheduleReconciliation(1);
      service.stopScheduledReconciliation();

      expect(mockMonitoring.captureMessage).toHaveBeenCalledWith(
        'Payment reconciliation scheduling stopped',
        'info'
      );
    });
  });

  describe('getReconciliationHealth', () => {
    it('should return healthy status when all systems are working', async () => {
      mockPrisma.transaction.count.mockResolvedValue(5); // 5 pending transactions
      mockStripe.charges.list.mockResolvedValue({ data: [] });

      // Mock successful reconciliation with no discrepancies
      mockPrisma.transaction.findMany.mockResolvedValue([]);
      mockStripe.paymentIntents.list.mockResolvedValue({ data: [] });

      const health = await service.getReconciliationHealth();

      expect(health.status).toBe('healthy');
      expect(health.pendingTransactions).toBe(5);
      expect(health.recentDiscrepancies).toBe(0);
      expect(health.checks.database.status).toBe('connected');
      expect(health.checks.stripe.status).toBe('connected');
    });

    it('should return critical status when Stripe is unavailable', async () => {
      mockPrisma.transaction.count.mockResolvedValue(2);
      mockStripe.charges.list.mockRejectedValue(new Error('Stripe API unavailable'));

      const health = await service.getReconciliationHealth();

      expect(health.status).toBe('critical');
      expect(health.checks.stripe.status).toBe('error');
      expect(health.checks.stripe.error).toBe('Stripe API unavailable');
    });

    it('should return warning status with many pending transactions', async () => {
      mockPrisma.transaction.count.mockResolvedValue(150); // Over threshold
      mockStripe.charges.list.mockResolvedValue({ data: [] });

      // Mock reconciliation with no discrepancies
      mockPrisma.transaction.findMany.mockResolvedValue([]);
      mockStripe.paymentIntents.list.mockResolvedValue({ data: [] });

      const health = await service.getReconciliationHealth();

      expect(health.status).toBe('warning');
      expect(health.pendingTransactions).toBe(150);
    });
  });

  describe('generateReconciliationReport', () => {
    it('should generate JSON report successfully', async () => {
      // Mock successful reconciliation
      mockPrisma.transaction.findMany.mockResolvedValue([]);
      mockStripe.paymentIntents.list.mockResolvedValue({ data: [] });
      mockStripe.charges.list.mockResolvedValue({ data: [] });

      const result = await service.generateReconciliationReport('json');

      expect(result.filePath).toContain('reconciliation-report-');
      expect(result.filePath).toContain('.json');
      expect(result.report).toBeDefined();
      expect(result.report.reportId).toBeDefined();

      expect(mockMonitoring.captureMessage).toHaveBeenCalledWith(
        expect.stringContaining('Reconciliation report generated:'),
        'info',
        expect.any(Object)
      );
    });

    it('should generate CSV report successfully', async () => {
      // Mock successful reconciliation
      mockPrisma.transaction.findMany.mockResolvedValue([]);
      mockStripe.paymentIntents.list.mockResolvedValue({ data: [] });
      mockStripe.charges.list.mockResolvedValue({ data: [] });

      const result = await service.generateReconciliationReport('csv');

      expect(result.filePath).toContain('reconciliation-report-');
      expect(result.filePath).toContain('.csv');
      expect(result.report).toBeDefined();
    });
  });
});

describe('PaymentReconciliationService - Singleton Pattern', () => {
  it('should return the same instance', () => {
    const instance1 = PaymentReconciliationService.getInstance();
    const instance2 = PaymentReconciliationService.getInstance();

    expect(instance1).toBe(instance2);
  });
});

describe('PaymentReconciliationService - Edge Cases', () => {
  let service: PaymentReconciliationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = PaymentReconciliationService.getInstance();
  });

  it('should prevent concurrent reconciliations', async () => {
    const mockPrisma = jest.mocked(prisma);
    mockPrisma.transaction.findMany.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve([]), 1000))
    );

    const firstReconciliation = service.reconcileTransactions();
    
    await expect(service.reconcileTransactions()).rejects.toThrow(
      'Reconciliation already in progress'
    );

    // Clean up
    await firstReconciliation;
  });

  it('should handle very large transaction volumes', async () => {
    // Create mock data for 1000+ transactions
    const largeLocalTransactionSet = Array.from({ length: 1000 }, (_, i) => ({
      id: `local_${i}`,
      userId: `user_${i % 10}`,
      amount: (Math.random() * 1000).toFixed(2),
      currency: 'USD',
      status: 'completed',
      paymentMethodId: `pm_${i % 5}`,
      reference: `pi_stripe_${i}`,
      createdAt: new Date(Date.now() - Math.random() * 86400000),
      completedAt: new Date(),
      description: `Payment ${i}`,
      metadata: null,
    }));

    const largeStripeTransactionSet = {
      data: Array.from({ length: 1000 }, (_, i) => ({
        id: `pi_stripe_${i}`,
        amount: Math.floor(Math.random() * 100000),
        currency: 'usd',
        status: 'succeeded',
        created: Math.floor((Date.now() - Math.random() * 86400000) / 1000),
        description: `Payment ${i}`,
        metadata: {},
        customer: `cus_${i % 10}`,
        payment_method: `pm_stripe_${i % 5}`,
      }))
    };

    const mockPrisma = jest.mocked(prisma);
    const mockStripe = jest.mocked(Stripe).mock.results[0].value as any;

    mockPrisma.transaction.findMany.mockResolvedValue(largeLocalTransactionSet);
    mockStripe.paymentIntents.list.mockResolvedValue(largeStripeTransactionSet);
    mockStripe.charges.list.mockResolvedValue({ data: [] });

    const start = Date.now();
    const result = await service.reconcileTransactions(
      new Date(Date.now() - 86400000),
      new Date()
    );
    const duration = Date.now() - start;

    expect(result).toBeDefined();
    expect(result.summary.totalLocalTransactions).toBe(1000);
    expect(result.summary.totalStripeTransactions).toBe(1000);
    expect(duration).toBeLessThan(30000); // Should complete within 30 seconds

    const mockMonitoring = jest.mocked(monitoring);
    expect(mockMonitoring.trackPerformanceMetric).toHaveBeenCalledWith(
      'reconciliation_total',
      expect.any(Number)
    );
  });
});