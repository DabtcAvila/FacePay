#!/usr/bin/env node

/**
 * FacePay Database Initialization Script
 * 
 * This script initializes the database with:
 * - Initial tables (via Prisma migrations)
 * - Demo users with biometric data
 * - Sample payment methods
 * - Initial credit balances
 * - Sample transactions
 * - Analytics and monitoring setup
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const prisma = new PrismaClient();

// Configuration
const DEMO_USERS = [
  {
    email: 'demo@facepay.com',
    name: 'Demo User',
    creditBalance: 50000n, // $500.00 in credits (1 USD = 100 credits)
  },
  {
    email: 'john.doe@example.com',
    name: 'John Doe',
    creditBalance: 25000n, // $250.00
  },
  {
    email: 'jane.smith@example.com',
    name: 'Jane Smith',
    creditBalance: 75000n, // $750.00
  },
  {
    email: 'merchant@facepay.com',
    name: 'Merchant Demo',
    creditBalance: 100000n, // $1000.00
  },
];

const SAMPLE_TRANSACTIONS = [
  {
    amount: 1999, // $19.99
    description: 'Coffee Shop Purchase',
    status: 'completed',
    currency: 'USD',
  },
  {
    amount: 4599, // $45.99
    description: 'Online Grocery Order',
    status: 'completed',
    currency: 'USD',
  },
  {
    amount: 299, // $2.99
    description: 'App Subscription',
    status: 'pending',
    currency: 'USD',
  },
];

// Utility functions
function generateSecureId() {
  return crypto.randomBytes(16).toString('hex');
}

function generateBiometricTemplate() {
  // Simulate encrypted biometric template
  return crypto.randomBytes(32).toString('base64');
}

function generatePaymentMethodDetails(type, provider) {
  switch (provider) {
    case 'stripe':
      return {
        cardId: `card_${generateSecureId()}`,
        last4: '4242',
        brand: 'visa',
        expiryMonth: 12,
        expiryYear: 2028,
      };
    case 'ethereum':
      return {
        address: `0x${generateSecureId()}${generateSecureId()}`,
        network: 'mainnet',
      };
    case 'bank':
      return {
        accountNumber: '****1234',
        routingNumber: '021000021',
        bankName: 'Demo Bank',
      };
    default:
      return {};
  }
}

async function clearDatabase() {
  console.log('🗑️  Clearing existing data...');
  
  // Delete in correct order to respect foreign key constraints
  await prisma.abTestResult.deleteMany();
  await prisma.abTestAssignment.deleteMany();
  await prisma.abTestVariant.deleteMany();
  await prisma.aBTest.deleteMany();
  
  await prisma.alert.deleteMany();
  await prisma.performanceMetric.deleteMany();
  await prisma.errorReport.deleteMany();
  await prisma.biometricEvent.deleteMany();
  await prisma.userJourneyStep.deleteMany();
  await prisma.conversionEvent.deleteMany();
  await prisma.analyticsEvent.deleteMany();
  
  await prisma.receipt.deleteMany();
  await prisma.refund.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.paymentMethod.deleteMany();
  
  await prisma.auditLog.deleteMany();
  await prisma.webauthnCredential.deleteMany();
  await prisma.biometricData.deleteMany();
  await prisma.user.deleteMany();
  
  console.log('✅ Database cleared');
}

async function createDemoUsers() {
  console.log('👥 Creating demo users...');
  
  const users = [];
  
  for (const userData of DEMO_USERS) {
    console.log(`   Creating user: ${userData.email}`);
    
    const user = await prisma.user.create({
      data: {
        email: userData.email,
        name: userData.name,
        creditBalance: userData.creditBalance,
        lastLoginAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    
    users.push(user);
    
    // Create biometric data for each user
    await prisma.biometricData.create({
      data: {
        userId: user.id,
        type: 'face',
        data: generateBiometricTemplate(),
        deviceId: `device_${generateSecureId()}`,
        confidence: 0.95 + Math.random() * 0.05, // 95-100% confidence
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    
    // Create sample WebAuthn credential
    await prisma.webauthnCredential.create({
      data: {
        userId: user.id,
        credentialId: generateSecureId(),
        publicKey: crypto.randomBytes(64).toString('base64'),
        counter: BigInt(Math.floor(Math.random() * 100)),
        transports: ['internal', 'hybrid'],
        backedUp: true,
        deviceType: 'multi_device',
        deviceName: `${userData.name}'s Device`,
        lastUsedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    
    // Create payment methods
    const paymentMethods = [
      { type: 'card', provider: 'stripe' },
      { type: 'crypto', provider: 'ethereum' },
      { type: 'bank', provider: 'bank' },
    ];
    
    for (let i = 0; i < paymentMethods.length; i++) {
      const method = paymentMethods[i];
      await prisma.paymentMethod.create({
        data: {
          userId: user.id,
          type: method.type,
          provider: method.provider,
          details: generatePaymentMethodDetails(method.type, method.provider),
          nickname: `${userData.name}'s ${method.type}`,
          isDefault: i === 0, // First method is default
          lastUsedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    }
  }
  
  console.log(`✅ Created ${users.length} demo users with biometric data and payment methods`);
  return users;
}

async function createSampleTransactions(users) {
  console.log('💳 Creating sample transactions...');
  
  let transactionCount = 0;
  
  for (const user of users) {
    // Get user's first payment method
    const paymentMethod = await prisma.paymentMethod.findFirst({
      where: { userId: user.id, isDefault: true },
    });
    
    if (!paymentMethod) continue;
    
    for (const txData of SAMPLE_TRANSACTIONS) {
      const transaction = await prisma.transaction.create({
        data: {
          userId: user.id,
          paymentMethodId: paymentMethod.id,
          amount: txData.amount,
          currency: txData.currency,
          status: txData.status,
          description: txData.description,
          reference: `tx_${generateSecureId()}`,
          fee: Math.floor(txData.amount * 0.029), // 2.9% fee
          metadata: {
            source: 'demo_data',
            channel: 'web',
            timestamp: new Date().toISOString(),
          },
          completedAt: txData.status === 'completed' ? new Date() : null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      
      // Create receipt for completed transactions
      if (txData.status === 'completed') {
        await prisma.receipt.create({
          data: {
            transactionId: transaction.id,
            receiptNumber: `RCP${Date.now()}${Math.floor(Math.random() * 1000)}`,
            format: 'json',
            data: {
              transactionId: transaction.id,
              amount: txData.amount,
              currency: txData.currency,
              description: txData.description,
              timestamp: new Date().toISOString(),
              merchant: 'FacePay Demo',
            },
            generatedAt: new Date(),
            updatedAt: new Date(),
          },
        });
      }
      
      transactionCount++;
    }
  }
  
  console.log(`✅ Created ${transactionCount} sample transactions with receipts`);
}

async function createAnalyticsData(users) {
  console.log('📊 Creating sample analytics data...');
  
  const events = [
    'page_view', 'user_login', 'payment_initiated', 'payment_completed',
    'biometric_auth_success', 'biometric_auth_failure', 'user_registration'
  ];
  
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  for (let i = 0; i < 100; i++) {
    const randomUser = users[Math.floor(Math.random() * users.length)];
    const randomEvent = events[Math.floor(Math.random() * events.length)];
    const randomTimestamp = new Date(oneWeekAgo.getTime() + Math.random() * (now.getTime() - oneWeekAgo.getTime()));
    
    await prisma.analyticsEvent.create({
      data: {
        name: randomEvent,
        properties: {
          page: '/dashboard',
          userAgent: 'Mozilla/5.0 (demo)',
          referrer: 'https://google.com',
        },
        timestamp: randomTimestamp,
        userId: randomUser.id,
        sessionId: `session_${generateSecureId()}`,
        url: 'https://facepay.vercel.app/dashboard',
        userAgent: 'Mozilla/5.0 (demo)',
        source: 'web',
        createdAt: randomTimestamp,
      },
    });
    
    // Create some biometric events
    if (randomEvent.includes('biometric')) {
      await prisma.biometricEvent.create({
        data: {
          userId: randomUser.id,
          sessionId: `session_${generateSecureId()}`,
          method: 'face_id',
          success: randomEvent.includes('success'),
          errorCode: randomEvent.includes('failure') ? 'AUTH_FAILED' : null,
          duration: Math.floor(Math.random() * 3000) + 500, // 500-3500ms
          timestamp: randomTimestamp,
          properties: {
            deviceType: 'desktop',
            browser: 'chrome',
          },
          createdAt: randomTimestamp,
        },
      });
    }
  }
  
  console.log('✅ Created sample analytics and biometric events');
}

async function createABTest() {
  console.log('🧪 Creating sample A/B test...');
  
  const test = await prisma.aBTest.create({
    data: {
      name: 'Checkout Button Color',
      description: 'Testing different checkout button colors for conversion',
      status: 'running',
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      traffic: 100,
      metrics: {
        primary: 'conversion_rate',
        secondary: ['click_through_rate', 'bounce_rate'],
      },
      createdBy: 'system',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });
  
  // Create variants
  const variants = [
    { name: 'Control', description: 'Original blue button', weight: 50, isControl: true },
    { name: 'Treatment', description: 'Green button', weight: 50, isControl: false },
  ];
  
  for (const variantData of variants) {
    await prisma.aBTestVariant.create({
      data: {
        testId: test.id,
        name: variantData.name,
        description: variantData.description,
        weight: variantData.weight,
        config: {
          buttonColor: variantData.isControl ? '#007bff' : '#28a745',
        },
        isControl: variantData.isControl,
        createdAt: new Date(),
      },
    });
  }
  
  console.log('✅ Created A/B test with variants');
}

async function createInitialAuditLog() {
  console.log('📝 Creating initial audit log...');
  
  await prisma.auditLog.create({
    data: {
      userId: null, // System action
      tableName: 'database',
      recordId: 'init',
      action: 'CREATE',
      oldValues: null,
      newValues: {
        action: 'database_initialization',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      },
      ipAddress: '127.0.0.1',
      userAgent: 'Database Init Script',
      createdAt: new Date(),
    },
  });
  
  console.log('✅ Created initial audit log entry');
}

async function showSummary(users) {
  console.log('\n' + '='.repeat(50));
  console.log('📊 DATABASE INITIALIZATION SUMMARY');
  console.log('='.repeat(50));
  
  const counts = {
    users: await prisma.user.count(),
    biometricData: await prisma.biometricData.count(),
    webauthnCredentials: await prisma.webauthnCredential.count(),
    paymentMethods: await prisma.paymentMethod.count(),
    transactions: await prisma.transaction.count(),
    receipts: await prisma.receipt.count(),
    analyticsEvents: await prisma.analyticsEvent.count(),
    biometricEvents: await prisma.biometricEvent.count(),
    abTests: await prisma.aBTest.count(),
    abTestVariants: await prisma.aBTestVariant.count(),
    auditLogs: await prisma.auditLog.count(),
  };
  
  console.log(`👥 Users: ${counts.users}`);
  console.log(`🔒 Biometric Data: ${counts.biometricData}`);
  console.log(`🔐 WebAuthn Credentials: ${counts.webauthnCredentials}`);
  console.log(`💳 Payment Methods: ${counts.paymentMethods}`);
  console.log(`💸 Transactions: ${counts.transactions}`);
  console.log(`🧾 Receipts: ${counts.receipts}`);
  console.log(`📊 Analytics Events: ${counts.analyticsEvents}`);
  console.log(`👆 Biometric Events: ${counts.biometricEvents}`);
  console.log(`🧪 A/B Tests: ${counts.abTests}`);
  console.log(`🔬 A/B Test Variants: ${counts.abTestVariants}`);
  console.log(`📝 Audit Logs: ${counts.auditLogs}`);
  
  console.log('\n💰 DEMO USERS & CREDITS:');
  for (const user of users) {
    const creditBalance = Number(user.creditBalance);
    const dollarAmount = (creditBalance / 100).toFixed(2);
    console.log(`   ${user.email}: $${dollarAmount} (${creditBalance} credits)`);
  }
  
  console.log('\n🔗 QUICK LINKS:');
  console.log('   Demo Login: /demo');
  console.log('   Dashboard: /dashboard');
  console.log('   Biometric Test: /test-biometric');
  console.log('   WebAuthn Test: /webauthn-test');
  console.log('   Payment Test: /payments');
  
  console.log('\n✅ Database initialization complete!');
  console.log('🚀 Your FacePay instance is ready for testing.');
}

async function main() {
  try {
    console.log('🚀 Starting FacePay database initialization...\n');
    
    // Step 1: Clear existing data (optional)
    if (process.argv.includes('--fresh')) {
      await clearDatabase();
    }
    
    // Step 2: Create demo users
    const users = await createDemoUsers();
    
    // Step 3: Create sample transactions
    await createSampleTransactions(users);
    
    // Step 4: Create analytics data
    await createAnalyticsData(users);
    
    // Step 5: Create A/B test
    await createABTest();
    
    // Step 6: Create audit log
    await createInitialAuditLog();
    
    // Step 7: Show summary
    await showSummary(users);
    
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Handle command line arguments
if (require.main === module) {
  main();
}

module.exports = {
  main,
  clearDatabase,
  createDemoUsers,
  createSampleTransactions,
  createAnalyticsData,
  createABTest,
  createInitialAuditLog,
};