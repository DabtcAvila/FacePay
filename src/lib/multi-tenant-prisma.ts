/**
 * Multi-tenant Prisma Client Wrapper
 * Automatically injects merchantId into all queries for data isolation
 */

import { PrismaClient, Prisma } from '@prisma/client';

// Extend the base Prisma client
export interface MultiTenantPrismaClient extends Omit<PrismaClient, '$transaction' | '$disconnect' | '$connect'> {
  $transaction: PrismaClient['$transaction'];
  $disconnect: PrismaClient['$disconnect'];  
  $connect: PrismaClient['$connect'];
  setMerchantContext: (merchantId: string) => void;
  clearMerchantContext: () => void;
}

class MultiTenantPrisma {
  private client: PrismaClient;
  private merchantId: string | null = null;

  constructor() {
    this.client = new PrismaClient();
    this.setupMiddleware();
  }

  private setupMiddleware() {
    // Middleware to automatically inject merchantId
    this.client.$use(async (params, next) => {
      // Skip if no merchant context is set
      if (!this.merchantId) {
        return next(params);
      }

      // Tables that should be filtered by merchantId
      const tenantTables = [
        'user',
        'biometricData', 
        'webauthnCredential',
        'paymentMethod',
        'transaction',
        'refund',
        'receipt',
        'auditLog',
        'analyticsEvent',
        'conversionEvent',
        'userJourneyStep',
        'biometricEvent',
        'errorReport',
        'performanceMetric',
        'alert',
        'aBTest',
        'merchantAnalytics',
        'merchantUsage',
        'merchantInvoice',
        'supportTicket',
        'merchantWebhook',
        'merchantApiKey'
      ];

      // Only apply middleware to tenant tables
      if (!tenantTables.includes(params.model as string)) {
        return next(params);
      }

      // Handle different operations
      switch (params.action) {
        case 'create':
          // Inject merchantId into create operations
          if (params.args.data) {
            params.args.data.merchantId = this.merchantId;
          }
          break;

        case 'createMany':
          // Inject merchantId into createMany operations
          if (params.args.data && Array.isArray(params.args.data)) {
            params.args.data = params.args.data.map((item: any) => ({
              ...item,
              merchantId: this.merchantId
            }));
          }
          break;

        case 'findFirst':
        case 'findFirstOrThrow':
        case 'findUnique':
        case 'findUniqueOrThrow':
        case 'findMany':
        case 'count':
        case 'aggregate':
        case 'groupBy':
          // Add merchantId filter to read operations
          params.args.where = {
            ...params.args.where,
            merchantId: this.merchantId
          };
          break;

        case 'update':
        case 'updateMany':
        case 'upsert':
          // Add merchantId filter to update operations
          params.args.where = {
            ...params.args.where,
            merchantId: this.merchantId
          };
          break;

        case 'delete':
        case 'deleteMany':
          // Add merchantId filter to delete operations
          params.args.where = {
            ...params.args.where,
            merchantId: this.merchantId
          };
          break;
      }

      return next(params);
    });
  }

  setMerchantContext(merchantId: string) {
    this.merchantId = merchantId;
  }

  clearMerchantContext() {
    this.merchantId = null;
  }

  // Proxy all PrismaClient methods
  get user() { return this.client.user; }
  get merchant() { return this.client.merchant; }
  get biometricData() { return this.client.biometricData; }
  get webauthnCredential() { return this.client.webauthnCredential; }
  get paymentMethod() { return this.client.paymentMethod; }
  get transaction() { return this.client.transaction; }
  get refund() { return this.client.refund; }
  get receipt() { return this.client.receipt; }
  get auditLog() { return this.client.auditLog; }
  get analyticsEvent() { return this.client.analyticsEvent; }
  get conversionEvent() { return this.client.conversionEvent; }
  get userJourneyStep() { return this.client.userJourneyStep; }
  get biometricEvent() { return this.client.biometricEvent; }
  get errorReport() { return this.client.errorReport; }
  get performanceMetric() { return this.client.performanceMetric; }
  get alert() { return this.client.alert; }
  get aBTest() { return this.client.aBTest; }
  get aBTestVariant() { return this.client.aBTestVariant; }
  get aBTestAssignment() { return this.client.aBTestAssignment; }
  get aBTestResult() { return this.client.aBTestResult; }
  get merchantApiKey() { return this.client.merchantApiKey; }
  get merchantWebhook() { return this.client.merchantWebhook; }
  get webhookDelivery() { return this.client.webhookDelivery; }
  get merchantUsage() { return this.client.merchantUsage; }
  get merchantInvoice() { return this.client.merchantInvoice; }
  get supportTicket() { return this.client.supportTicket; }
  get ticketReply() { return this.client.ticketReply; }
  get merchantAnalytics() { return this.client.merchantAnalytics; }

  // Proxy utility methods
  get $transaction() { return this.client.$transaction.bind(this.client); }
  get $disconnect() { return this.client.$disconnect.bind(this.client); }
  get $connect() { return this.client.$connect.bind(this.client); }
}

// Create singleton instance
const multiTenantPrisma = new MultiTenantPrisma() as MultiTenantPrismaClient;

// Helper function to create merchant-scoped client for API routes
export function createMerchantScopedClient(merchantId: string): MultiTenantPrismaClient {
  const client = new MultiTenantPrisma() as MultiTenantPrismaClient;
  client.setMerchantContext(merchantId);
  return client;
}

// Helper function to get client from request context
export function getPrismaFromRequest(request: Request): MultiTenantPrismaClient {
  const merchantId = request.headers.get('x-merchant-id');
  if (merchantId) {
    return createMerchantScopedClient(merchantId);
  }
  return multiTenantPrisma;
}

export { multiTenantPrisma };
export default multiTenantPrisma;