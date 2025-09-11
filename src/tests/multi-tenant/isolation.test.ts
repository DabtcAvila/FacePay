/**
 * Multi-tenant Data Isolation Tests
 * Tests to ensure merchants cannot access each other's data
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import { createMerchantScopedClient } from '@/lib/multi-tenant-prisma';
import crypto from 'crypto';

const prisma = new PrismaClient();

describe('Multi-tenant Data Isolation', () => {
  let merchant1Id: string;
  let merchant2Id: string;
  let merchant1Client: any;
  let merchant2Client: any;
  
  beforeAll(async () => {
    // Create test merchants
    const merchant1 = await prisma.merchant.create({
      data: {
        email: `test1-${Date.now()}@example.com`,
        companyName: 'Test Company 1',
        businessType: 'llc',
        billingEmail: `billing1-${Date.now()}@example.com`,
        billingAddress: {
          street: '123 Test St',
          city: 'Test City',
          state: 'Test State',
          zipCode: '12345',
          country: 'US'
        },
        publicKey: `pk_test_${crypto.randomBytes(16).toString('hex')}`,
        secretKey: `sk_test_${crypto.randomBytes(16).toString('hex')}`,
        webhookSecret: `whsec_${crypto.randomBytes(16).toString('hex')}`
      }
    });
    
    const merchant2 = await prisma.merchant.create({
      data: {
        email: `test2-${Date.now()}@example.com`,
        companyName: 'Test Company 2',
        businessType: 'corporation',
        billingEmail: `billing2-${Date.now()}@example.com`,
        billingAddress: {
          street: '456 Test Ave',
          city: 'Test City',
          state: 'Test State',
          zipCode: '12345',
          country: 'US'
        },
        publicKey: `pk_test_${crypto.randomBytes(16).toString('hex')}`,
        secretKey: `sk_test_${crypto.randomBytes(16).toString('hex')}`,
        webhookSecret: `whsec_${crypto.randomBytes(16).toString('hex')}`
      }
    });
    
    merchant1Id = merchant1.id;
    merchant2Id = merchant2.id;
    
    // Create scoped clients
    merchant1Client = createMerchantScopedClient(merchant1Id);
    merchant2Client = createMerchantScopedClient(merchant2Id);
  });
  
  afterAll(async () => {
    // Clean up test data
    await prisma.user.deleteMany({
      where: { merchantId: { in: [merchant1Id, merchant2Id] } }
    });
    await prisma.merchant.deleteMany({
      where: { id: { in: [merchant1Id, merchant2Id] } }
    });
    await prisma.$disconnect();
  });

  describe('User Data Isolation', () => {
    it('should isolate users between merchants', async () => {
      // Create users for each merchant
      const user1 = await merchant1Client.user.create({
        data: {
          email: `user1-${Date.now()}@example.com`,
          name: 'User 1'
        }
      });
      
      const user2 = await merchant2Client.user.create({
        data: {
          email: `user2-${Date.now()}@example.com`,
          name: 'User 2'
        }
      });
      
      // Merchant 1 should only see their user
      const merchant1Users = await merchant1Client.user.findMany();
      expect(merchant1Users).toHaveLength(1);
      expect(merchant1Users[0].id).toBe(user1.id);
      expect(merchant1Users[0].merchantId).toBe(merchant1Id);
      
      // Merchant 2 should only see their user
      const merchant2Users = await merchant2Client.user.findMany();
      expect(merchant2Users).toHaveLength(1);
      expect(merchant2Users[0].id).toBe(user2.id);
      expect(merchant2Users[0].merchantId).toBe(merchant2Id);
      
      // Cross-merchant access should fail
      const crossAccessUser = await merchant1Client.user.findUnique({
        where: { id: user2.id }
      });
      expect(crossAccessUser).toBeNull();
    });
    
    it('should prevent cross-merchant user updates', async () => {
      const user1 = await merchant1Client.user.create({
        data: {
          email: `user-update-${Date.now()}@example.com`,
          name: 'Original User'
        }
      });
      
      // Merchant 2 should not be able to update Merchant 1's user
      await expect(
        merchant2Client.user.update({
          where: { id: user1.id },
          data: { name: 'Hacked User' }
        })
      ).rejects.toThrow();
      
      // Verify user wasn't updated
      const unchangedUser = await merchant1Client.user.findUnique({
        where: { id: user1.id }
      });
      expect(unchangedUser?.name).toBe('Original User');
    });
  });

  describe('Transaction Data Isolation', () => {
    it('should isolate transactions between merchants', async () => {
      // Create users and payment methods for each merchant
      const user1 = await merchant1Client.user.create({
        data: {
          email: `txn-user1-${Date.now()}@example.com`,
          name: 'Transaction User 1'
        }
      });
      
      const user2 = await merchant2Client.user.create({
        data: {
          email: `txn-user2-${Date.now()}@example.com`,
          name: 'Transaction User 2'
        }
      });
      
      const paymentMethod1 = await merchant1Client.paymentMethod.create({
        data: {
          userId: user1.id,
          type: 'card',
          provider: 'stripe',
          details: { last4: '4242' }
        }
      });
      
      const paymentMethod2 = await merchant2Client.paymentMethod.create({
        data: {
          userId: user2.id,
          type: 'card',
          provider: 'stripe',
          details: { last4: '4444' }
        }
      });
      
      // Create transactions for each merchant
      const transaction1 = await merchant1Client.transaction.create({
        data: {
          userId: user1.id,
          paymentMethodId: paymentMethod1.id,
          amount: 1000,
          currency: 'USD',
          description: 'Test transaction 1'
        }
      });
      
      const transaction2 = await merchant2Client.transaction.create({
        data: {
          userId: user2.id,
          paymentMethodId: paymentMethod2.id,
          amount: 2000,
          currency: 'USD',
          description: 'Test transaction 2'
        }
      });
      
      // Each merchant should only see their transactions
      const merchant1Transactions = await merchant1Client.transaction.findMany();
      expect(merchant1Transactions).toHaveLength(1);
      expect(merchant1Transactions[0].id).toBe(transaction1.id);
      
      const merchant2Transactions = await merchant2Client.transaction.findMany();
      expect(merchant2Transactions).toHaveLength(1);
      expect(merchant2Transactions[0].id).toBe(transaction2.id);
      
      // Cross-merchant transaction access should fail
      const crossAccessTransaction = await merchant1Client.transaction.findUnique({
        where: { id: transaction2.id }
      });
      expect(crossAccessTransaction).toBeNull();
    });
  });

  describe('Analytics Data Isolation', () => {
    it('should isolate analytics events between merchants', async () => {
      const event1 = await merchant1Client.analyticsEvent.create({
        data: {
          id: `evt_${Date.now()}_1`,
          name: 'payment_started',
          properties: { amount: 1000 },
          timestamp: new Date(),
          sessionId: 'session_1',
          url: '/payment',
          userAgent: 'test-agent',
          source: 'web'
        }
      });
      
      const event2 = await merchant2Client.analyticsEvent.create({
        data: {
          id: `evt_${Date.now()}_2`,
          name: 'payment_completed',
          properties: { amount: 2000 },
          timestamp: new Date(),
          sessionId: 'session_2',
          url: '/success',
          userAgent: 'test-agent',
          source: 'web'
        }
      });
      
      // Each merchant should only see their events
      const merchant1Events = await merchant1Client.analyticsEvent.findMany();
      expect(merchant1Events).toHaveLength(1);
      expect(merchant1Events[0].id).toBe(event1.id);
      
      const merchant2Events = await merchant2Client.analyticsEvent.findMany();
      expect(merchant2Events).toHaveLength(1);
      expect(merchant2Events[0].id).toBe(event2.id);
    });
  });

  describe('API Key Isolation', () => {
    it('should isolate API keys between merchants', async () => {
      const apiKey1 = await merchant1Client.merchantApiKey.create({
        data: {
          keyId: crypto.randomBytes(8).toString('hex'),
          hashedKey: crypto.randomBytes(32).toString('hex'),
          name: 'Test Key 1',
          permissions: ['payments:read']
        }
      });
      
      const apiKey2 = await merchant2Client.merchantApiKey.create({
        data: {
          keyId: crypto.randomBytes(8).toString('hex'),
          hashedKey: crypto.randomBytes(32).toString('hex'),
          name: 'Test Key 2',
          permissions: ['transactions:read']
        }
      });
      
      // Each merchant should only see their API keys
      const merchant1Keys = await merchant1Client.merchantApiKey.findMany();
      expect(merchant1Keys).toHaveLength(1);
      expect(merchant1Keys[0].id).toBe(apiKey1.id);
      
      const merchant2Keys = await merchant2Client.merchantApiKey.findMany();
      expect(merchant2Keys).toHaveLength(1);
      expect(merchant2Keys[0].id).toBe(apiKey2.id);
    });
  });

  describe('Webhook Isolation', () => {
    it('should isolate webhooks between merchants', async () => {
      const webhook1 = await merchant1Client.merchantWebhook.create({
        data: {
          url: 'https://merchant1.example.com/webhook',
          events: ['payment.succeeded'],
          secret: 'secret1'
        }
      });
      
      const webhook2 = await merchant2Client.merchantWebhook.create({
        data: {
          url: 'https://merchant2.example.com/webhook',
          events: ['payment.failed'],
          secret: 'secret2'
        }
      });
      
      // Each merchant should only see their webhooks
      const merchant1Webhooks = await merchant1Client.merchantWebhook.findMany();
      expect(merchant1Webhooks).toHaveLength(1);
      expect(merchant1Webhooks[0].id).toBe(webhook1.id);
      
      const merchant2Webhooks = await merchant2Client.merchantWebhook.findMany();
      expect(merchant2Webhooks).toHaveLength(1);
      expect(merchant2Webhooks[0].id).toBe(webhook2.id);
    });
  });

  describe('Audit Log Isolation', () => {
    it('should isolate audit logs between merchants', async () => {
      const audit1 = await merchant1Client.auditLog.create({
        data: {
          tableName: 'transactions',
          recordId: 'txn_123',
          action: 'CREATE',
          newValues: { amount: 1000 }
        }
      });
      
      const audit2 = await merchant2Client.auditLog.create({
        data: {
          tableName: 'users',
          recordId: 'user_456',
          action: 'UPDATE',
          newValues: { name: 'Updated User' }
        }
      });
      
      // Each merchant should only see their audit logs
      const merchant1Audits = await merchant1Client.auditLog.findMany();
      expect(merchant1Audits).toHaveLength(1);
      expect(merchant1Audits[0].id).toBe(audit1.id);
      
      const merchant2Audits = await merchant2Client.auditLog.findMany();
      expect(merchant2Audits).toHaveLength(1);
      expect(merchant2Audits[0].id).toBe(audit2.id);
    });
  });

  describe('Usage Tracking Isolation', () => {
    it('should isolate usage records between merchants', async () => {
      const period = new Date().toISOString().substring(0, 7);
      
      const usage1 = await merchant1Client.merchantUsage.create({
        data: {
          period,
          metric: 'api_calls',
          quantity: 100,
          cost: 1.00
        }
      });
      
      const usage2 = await merchant2Client.merchantUsage.create({
        data: {
          period,
          metric: 'api_calls',
          quantity: 200,
          cost: 2.00
        }
      });
      
      // Each merchant should only see their usage
      const merchant1Usage = await merchant1Client.merchantUsage.findMany();
      expect(merchant1Usage).toHaveLength(1);
      expect(merchant1Usage[0].id).toBe(usage1.id);
      expect(merchant1Usage[0].quantity).toBe(BigInt(100));
      
      const merchant2Usage = await merchant2Client.merchantUsage.findMany();
      expect(merchant2Usage).toHaveLength(1);
      expect(merchant2Usage[0].id).toBe(usage2.id);
      expect(merchant2Usage[0].quantity).toBe(BigInt(200));
    });
  });

  describe('Cross-tenant Data Leakage Prevention', () => {
    it('should prevent data leakage through relationships', async () => {
      // Create related data for merchant 1
      const user1 = await merchant1Client.user.create({
        data: {
          email: `leak-test-${Date.now()}@example.com`,
          name: 'Leak Test User'
        }
      });
      
      const biometric1 = await merchant1Client.biometricData.create({
        data: {
          userId: user1.id,
          type: 'face',
          data: 'encrypted_biometric_data',
          confidence: 0.95
        }
      });
      
      // Merchant 2 should not be able to access biometric data through user relationship
      const merchant2BiometricData = await merchant2Client.biometricData.findMany({
        where: { userId: user1.id }
      });
      expect(merchant2BiometricData).toHaveLength(0);
      
      // Merchant 2 should not be able to access biometric data directly
      const directAccess = await merchant2Client.biometricData.findUnique({
        where: { id: biometric1.id }
      });
      expect(directAccess).toBeNull();
    });
    
    it('should enforce merchant isolation in aggregation queries', async () => {
      // Create transactions for merchant 1
      const user1 = await merchant1Client.user.create({
        data: {
          email: `agg-test1-${Date.now()}@example.com`,
          name: 'Aggregation Test User 1'
        }
      });
      
      const paymentMethod1 = await merchant1Client.paymentMethod.create({
        data: {
          userId: user1.id,
          type: 'card',
          provider: 'stripe',
          details: { last4: '1111' }
        }
      });
      
      await merchant1Client.transaction.create({
        data: {
          userId: user1.id,
          paymentMethodId: paymentMethod1.id,
          amount: 1000,
          currency: 'USD'
        }
      });
      
      await merchant1Client.transaction.create({
        data: {
          userId: user1.id,
          paymentMethodId: paymentMethod1.id,
          amount: 2000,
          currency: 'USD'
        }
      });
      
      // Merchant 1 should see correct aggregate
      const merchant1Aggregate = await merchant1Client.transaction.aggregate({
        _sum: { amount: true },
        _count: true
      });
      expect(merchant1Aggregate._count).toBe(2);
      expect(merchant1Aggregate._sum.amount).toBe(3000);
      
      // Merchant 2 should see zero
      const merchant2Aggregate = await merchant2Client.transaction.aggregate({
        _sum: { amount: true },
        _count: true
      });
      expect(merchant2Aggregate._count).toBe(0);
      expect(merchant2Aggregate._sum.amount).toBeNull();
    });
  });
});