#!/usr/bin/env node

/**
 * FacePay Test Users Generation Script
 * 
 * This script creates:
 * - 10 test users with varying credit balances
 * - Test transactions between users
 * - Float calculation demonstrations
 * - 0% fee system demonstration
 * 
 * Usage:
 *   node scripts/generate-test-users.js
 *   node scripts/generate-test-users.js --fresh (clears existing data first)
 */

const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

// Configuration for test users
const TEST_USERS = [
  {
    email: 'alice@facepay.test',
    name: 'Alice Johnson',
    creditBalance: 150000n, // $1,500.00 (High balance user)
  },
  {
    email: 'bob@facepay.test', 
    name: 'Bob Smith',
    creditBalance: 75000n, // $750.00 (Medium balance user)
  },
  {
    email: 'charlie@facepay.test',
    name: 'Charlie Brown',
    creditBalance: 25000n, // $250.00 (Low balance user)
  },
  {
    email: 'diana@facepay.test',
    name: 'Diana Prince',
    creditBalance: 500000n, // $5,000.00 (Premium user)
  },
  {
    email: 'eve@facepay.test',
    name: 'Eve Wilson',
    creditBalance: 100000n, // $1,000.00 (Standard user)
  },
  {
    email: 'frank@facepay.test',
    name: 'Frank Miller',
    creditBalance: 5000n, // $50.00 (Minimal balance user)
  },
  {
    email: 'grace@facepay.test',
    name: 'Grace Lee',
    creditBalance: 200000n, // $2,000.00 (Business user)
  },
  {
    email: 'henry@facepay.test',
    name: 'Henry Ford',
    creditBalance: 0n, // $0.00 (New user, no balance)
  },
  {
    email: 'iris@facepay.test',
    name: 'Iris Chen',
    creditBalance: 300000n, // $3,000.00 (Power user)
  },
  {
    email: 'jack@facepay.test',
    name: 'Jack Thompson',
    creditBalance: 50000n, // $500.00 (Regular user)
  }
];

// Test transaction scenarios
const TRANSACTION_SCENARIOS = [
  {
    description: 'Coffee Purchase',
    amounts: [599, 799, 1299], // $5.99, $7.99, $12.99
    type: 'merchant_payment'
  },
  {
    description: 'Peer-to-Peer Transfer',
    amounts: [2000, 5000, 10000], // $20.00, $50.00, $100.00
    type: 'p2p_transfer'
  },
  {
    description: 'Online Shopping',
    amounts: [3499, 8999, 15999], // $34.99, $89.99, $159.99
    type: 'e_commerce'
  },
  {
    description: 'Subscription Payment',
    amounts: [999, 1999, 4999], // $9.99, $19.99, $49.99
    type: 'subscription'
  },
  {
    description: 'Utility Bill',
    amounts: [4500, 12000, 25000], // $45.00, $120.00, $250.00
    type: 'bill_payment'
  }
];

// Utility Functions
function generateSecureId() {
  return crypto.randomBytes(16).toString('hex');
}

function generateBiometricTemplate() {
  return crypto.randomBytes(32).toString('base64');
}

function formatCredits(credits) {
  return `$${(Number(credits) / 100).toFixed(2)}`;
}

function generatePaymentMethodDetails(type) {
  switch (type) {
    case 'card':
      return {
        cardId: `card_${generateSecureId()}`,
        last4: Math.floor(1000 + Math.random() * 9000).toString(),
        brand: ['visa', 'mastercard', 'amex'][Math.floor(Math.random() * 3)],
        expiryMonth: Math.floor(1 + Math.random() * 12),
        expiryYear: 2025 + Math.floor(Math.random() * 5),
      };
    case 'bank':
      return {
        accountNumber: `****${Math.floor(1000 + Math.random() * 9000)}`,
        routingNumber: '021000021',
        bankName: ['Chase', 'Bank of America', 'Wells Fargo', 'Citibank'][Math.floor(Math.random() * 4)],
      };
    case 'digital_wallet':
      return {
        walletId: `wallet_${generateSecureId()}`,
        provider: ['apple_pay', 'google_pay', 'samsung_pay'][Math.floor(Math.random() * 3)],
      };
    default:
      return {};
  }
}

async function clearTestData() {
  console.log('🗑️  Clearing existing test data...');
  
  // Only clear test users and their related data
  const testEmails = TEST_USERS.map(u => u.email);
  
  // Get test user IDs
  const testUsers = await prisma.user.findMany({
    where: { email: { in: testEmails } },
    select: { id: true }
  });
  
  const testUserIds = testUsers.map(u => u.id);
  
  if (testUserIds.length > 0) {
    // Delete in correct order to respect foreign key constraints
    await prisma.receipt.deleteMany({
      where: { transaction: { userId: { in: testUserIds } } }
    });
    
    await prisma.refund.deleteMany({
      where: { transaction: { userId: { in: testUserIds } } }
    });
    
    await prisma.transaction.deleteMany({
      where: { userId: { in: testUserIds } }
    });
    
    await prisma.paymentMethod.deleteMany({
      where: { userId: { in: testUserIds } }
    });
    
    await prisma.webauthnCredential.deleteMany({
      where: { userId: { in: testUserIds } }
    });
    
    await prisma.biometricData.deleteMany({
      where: { userId: { in: testUserIds } }
    });
    
    await prisma.auditLog.deleteMany({
      where: { userId: { in: testUserIds } }
    });
    
    await prisma.user.deleteMany({
      where: { id: { in: testUserIds } }
    });
  }
  
  console.log('✅ Test data cleared');
}

async function createTestUsers() {
  console.log('👥 Creating test users...');
  
  const users = [];
  
  for (const userData of TEST_USERS) {
    console.log(`   Creating user: ${userData.email} with ${formatCredits(userData.creditBalance)}`);
    
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
    
    // Create biometric data
    await prisma.biometricData.create({
      data: {
        userId: user.id,
        type: 'face',
        data: generateBiometricTemplate(),
        deviceId: `device_${generateSecureId()}`,
        confidence: 0.95 + Math.random() * 0.05, // 95-100% confidence
      },
    });
    
    // Create WebAuthn credential
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
      },
    });
    
    // Create multiple payment methods
    const paymentMethods = ['card', 'bank', 'digital_wallet'];
    
    for (let i = 0; i < paymentMethods.length; i++) {
      const method = paymentMethods[i];
      await prisma.paymentMethod.create({
        data: {
          userId: user.id,
          type: method,
          provider: method === 'card' ? 'stripe' : method,
          details: generatePaymentMethodDetails(method),
          nickname: `${userData.name}'s ${method.replace('_', ' ')}`,
          isDefault: i === 0,
          lastUsedAt: new Date(),
        },
      });
    }
  }
  
  console.log(`✅ Created ${users.length} test users with biometric data and payment methods`);
  return users;
}

async function createTestTransactions(users) {
  console.log('💳 Generating test transactions...');
  
  const transactions = [];
  let totalFloat = 0;
  let totalFeesSaved = 0;
  
  for (let i = 0; i < 50; i++) { // Generate 50 random transactions
    const fromUser = users[Math.floor(Math.random() * users.length)];
    const toUser = users.filter(u => u.id !== fromUser.id)[Math.floor(Math.random() * (users.length - 1))];
    
    const scenario = TRANSACTION_SCENARIOS[Math.floor(Math.random() * TRANSACTION_SCENARIOS.length)];
    const amount = scenario.amounts[Math.floor(Math.random() * scenario.amounts.length)];
    
    // Get user's default payment method
    const paymentMethod = await prisma.paymentMethod.findFirst({
      where: { userId: fromUser.id, isDefault: true },
    });
    
    if (!paymentMethod) continue;
    
    // Check if user has enough balance for P2P transfers
    const isP2P = scenario.type === 'p2p_transfer';
    const canAfford = Number(fromUser.creditBalance) >= amount;
    
    if (isP2P && !canAfford) {
      continue; // Skip this transaction if user can't afford it
    }
    
    // Calculate traditional fee (what other platforms would charge)
    const traditionalFeeRate = 0.029; // 2.9% (typical credit card processing fee)
    const traditionalFee = Math.floor(amount * traditionalFeeRate);
    
    // FacePay charges 0% fees!
    const facepayFee = 0;
    
    const transaction = await prisma.transaction.create({
      data: {
        userId: fromUser.id,
        paymentMethodId: paymentMethod.id,
        amount: amount,
        currency: 'USD',
        status: Math.random() > 0.1 ? 'completed' : 'pending', // 90% completion rate
        description: `${scenario.description}${isP2P ? ` to ${toUser.name}` : ''}`,
        reference: `tx_${generateSecureId()}`,
        fee: facepayFee, // FacePay's revolutionary 0% fee!
        metadata: {
          type: scenario.type,
          traditional_fee_saved: traditionalFee,
          recipient_id: isP2P ? toUser.id : null,
          float_contribution: amount,
          source: 'test_data',
        },
        completedAt: Math.random() > 0.1 ? new Date() : null,
      },
    });
    
    transactions.push(transaction);
    
    // Update balances for P2P transfers
    if (isP2P && transaction.status === 'completed') {
      await prisma.user.update({
        where: { id: fromUser.id },
        data: { creditBalance: BigInt(Number(fromUser.creditBalance) - amount) },
      });
      
      await prisma.user.update({
        where: { id: toUser.id },
        data: { creditBalance: BigInt(Number(toUser.creditBalance) + amount) },
      });
    }
    
    // Track float and fees saved
    totalFloat += amount;
    totalFeesSaved += traditionalFee;
    
    // Create receipt for completed transactions
    if (transaction.status === 'completed') {
      await prisma.receipt.create({
        data: {
          transactionId: transaction.id,
          receiptNumber: `RCP${Date.now()}${Math.floor(Math.random() * 1000)}`,
          format: 'json',
          data: {
            transactionId: transaction.id,
            amount: amount,
            currency: 'USD',
            description: transaction.description,
            fee_charged: facepayFee,
            traditional_fee_saved: traditionalFee,
            timestamp: new Date().toISOString(),
            merchant: 'FacePay Demo',
            zero_fee_message: '🎉 You saved money with FacePay\'s 0% transaction fee!',
          },
          generatedAt: new Date(),
        },
      });
    }
  }
  
  console.log(`✅ Created ${transactions.length} test transactions`);
  console.log(`💰 Total float generated: ${formatCredits(totalFloat)}`);
  console.log(`🎯 Total fees saved for users: ${formatCredits(totalFeesSaved)}`);
  
  return { transactions, totalFloat, totalFeesSaved };
}

async function demonstrateFloatCalculation() {
  console.log('\n💡 FLOAT CALCULATION DEMONSTRATION');
  console.log('='.repeat(50));
  
  // Get all completed transactions
  const completedTransactions = await prisma.transaction.findMany({
    where: { 
      status: 'completed',
      metadata: { path: ['source'], equals: 'test_data' }
    },
    select: {
      amount: true,
      createdAt: true,
      metadata: true,
    },
  });
  
  const totalTransactionVolume = completedTransactions.reduce((sum, tx) => sum + Number(tx.amount), 0);
  
  // Float calculation scenarios
  const scenarios = {
    '1_day': {
      period: 1,
      interestRate: 0.05 / 365, // 5% APY daily
      description: '1 Day Float'
    },
    '1_week': {
      period: 7,
      interestRate: 0.05 / 52, // 5% APY weekly  
      description: '1 Week Float'
    },
    '1_month': {
      period: 30,
      interestRate: 0.05 / 12, // 5% APY monthly
      description: '1 Month Float'
    },
    '1_year': {
      period: 365,
      interestRate: 0.05, // 5% APY annually
      description: '1 Year Float'
    }
  };
  
  console.log(`📊 Total Transaction Volume: ${formatCredits(totalTransactionVolume)}`);
  console.log(`📈 Float Interest Scenarios (5% APY):\n`);
  
  Object.entries(scenarios).forEach(([key, scenario]) => {
    const floatInterest = totalTransactionVolume * scenario.interestRate;
    console.log(`   ${scenario.description.padEnd(15)}: ${formatCredits(floatInterest)} interest earned`);
  });
  
  // Show how float scales with volume
  console.log(`\n📈 Float Scaling Examples:`);
  const volumeScales = [10, 100, 1000, 10000]; // 10x, 100x, 1000x, 10000x volume
  
  volumeScales.forEach(scale => {
    const scaledVolume = totalTransactionVolume * scale;
    const monthlyFloat = scaledVolume * scenarios['1_month'].interestRate;
    const yearlyFloat = scaledVolume * scenarios['1_year'].interestRate;
    
    console.log(`   ${scale}x Volume (${formatCredits(scaledVolume)}):`);
    console.log(`      Monthly Float Interest: ${formatCredits(monthlyFloat)}`);
    console.log(`      Yearly Float Interest:  ${formatCredits(yearlyFloat)}\n`);
  });
}

async function demonstrateZeroFeeSystem() {
  console.log('💡 ZERO FEE SYSTEM DEMONSTRATION');
  console.log('='.repeat(50));
  
  // Calculate total fees saved
  const transactions = await prisma.transaction.findMany({
    where: { 
      metadata: { path: ['source'], equals: 'test_data' }
    },
    select: {
      amount: true,
      fee: true,
      metadata: true,
    },
  });
  
  const totalFeesSaved = transactions.reduce((sum, tx) => {
    const traditionalFee = tx.metadata?.traditional_fee_saved || 0;
    return sum + traditionalFee;
  }, 0);
  
  const totalVolume = transactions.reduce((sum, tx) => sum + Number(tx.amount), 0);
  const averageFeeRate = (totalFeesSaved / totalVolume) * 100;
  
  console.log(`💳 Traditional Payment Processors (2.9% avg fee):`);
  console.log(`   Total Transaction Volume: ${formatCredits(totalVolume)}`);
  console.log(`   Traditional Fees Would Be: ${formatCredits(totalFeesSaved)}`);
  console.log(`   Average Fee Rate: ${averageFeeRate.toFixed(2)}%\n`);
  
  console.log(`🎉 FacePay Revolutionary Approach:`);
  console.log(`   Transaction Fees Charged: $0.00 (0%)`);
  console.log(`   Total Savings for Users: ${formatCredits(totalFeesSaved)}`);
  console.log(`   Revenue Model: Float interest on transaction volume\n`);
  
  // Show competitive advantage
  console.log(`🏆 Competitive Advantage:`);
  console.log(`   Traditional Processors: Charge fees, no float benefit`);
  console.log(`   FacePay: 0% fees + float interest = win-win model`);
  console.log(`   User Benefit: Keep 100% of transaction value`);
  console.log(`   Business Benefit: Sustainable revenue from float\n`);
  
  // Revenue projection
  const projectedAnnualVolume = totalVolume * 365; // Extrapolate daily volume to yearly
  const projectedFloatRevenue = projectedAnnualVolume * 0.05; // 5% APY on float
  
  console.log(`📊 Revenue Model Projection (based on test data):`);
  console.log(`   Projected Annual Volume: ${formatCredits(projectedAnnualVolume)}`);
  console.log(`   Projected Float Revenue (5% APY): ${formatCredits(projectedFloatRevenue)}`);
  console.log(`   User Fees Saved: ${formatCredits(totalFeesSaved * 365)}`);
  console.log(`   Net Benefit to Ecosystem: ${formatCredits((totalFeesSaved * 365) + projectedFloatRevenue)}`);
}

async function showTestDataSummary() {
  console.log('\n📊 TEST DATA SUMMARY');
  console.log('='.repeat(50));
  
  // Get test users
  const testEmails = TEST_USERS.map(u => u.email);
  const users = await prisma.user.findMany({
    where: { email: { in: testEmails } },
    include: {
      transactions: {
        where: { metadata: { path: ['source'], equals: 'test_data' } }
      },
      paymentMethods: true,
      biometricData: true,
    },
  });
  
  const totalUsers = users.length;
  const totalTransactions = users.reduce((sum, user) => sum + user.transactions.length, 0);
  const totalCredits = users.reduce((sum, user) => sum + Number(user.creditBalance), 0);
  
  console.log(`👥 Test Users Created: ${totalUsers}`);
  console.log(`💳 Total Transactions: ${totalTransactions}`);
  console.log(`💰 Total Credits in System: ${formatCredits(totalCredits)}`);
  
  console.log(`\n💰 User Balances:`);
  users.forEach(user => {
    const transactionCount = user.transactions.length;
    console.log(`   ${user.name.padEnd(20)}: ${formatCredits(user.creditBalance)} (${transactionCount} transactions)`);
  });
  
  console.log(`\n🔗 Test Endpoints:`);
  console.log(`   Login as test user: POST /api/auth/login`);
  console.log(`   View transactions: GET /api/transactions/history`);
  console.log(`   Create transaction: POST /api/transactions`);
  console.log(`   View user profile: GET /api/users/profile`);
  
  console.log(`\n✅ Test data generation complete!`);
  console.log(`🚀 Your FacePay test environment is ready.`);
}

async function createAuditLog() {
  await prisma.auditLog.create({
    data: {
      userId: null,
      tableName: 'test_data',
      recordId: 'generation',
      action: 'CREATE',
      oldValues: null,
      newValues: {
        action: 'test_data_generation',
        users_created: TEST_USERS.length,
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      },
      ipAddress: '127.0.0.1',
      userAgent: 'Test Data Generation Script',
      createdAt: new Date(),
    },
  });
}

async function main() {
  try {
    console.log('🚀 Starting FacePay test data generation...\n');
    console.log('🎯 This script demonstrates:');
    console.log('   • 10 test users with varying credit balances');
    console.log('   • Real transaction scenarios between users'); 
    console.log('   • Float interest calculation models');
    console.log('   • Zero-fee system competitive advantage\n');
    
    // Step 1: Clear existing test data if requested
    if (process.argv.includes('--fresh')) {
      await clearTestData();
    }
    
    // Step 2: Create test users
    const users = await createTestUsers();
    
    // Step 3: Generate test transactions
    const { transactions, totalFloat, totalFeesSaved } = await createTestTransactions(users);
    
    // Step 4: Demonstrate float calculation
    await demonstrateFloatCalculation();
    
    // Step 5: Demonstrate zero fee system
    await demonstrateZeroFeeSystem();
    
    // Step 6: Create audit log
    await createAuditLog();
    
    // Step 7: Show summary
    await showTestDataSummary();
    
  } catch (error) {
    console.error('❌ Error generating test data:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Handle command line execution
if (require.main === module) {
  main();
}

module.exports = {
  main,
  createTestUsers,
  createTestTransactions,
  demonstrateFloatCalculation,
  demonstrateZeroFeeSystem,
  TEST_USERS,
  TRANSACTION_SCENARIOS,
};