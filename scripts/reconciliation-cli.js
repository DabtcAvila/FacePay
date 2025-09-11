#!/usr/bin/env node

/**
 * Payment Reconciliation CLI Tool
 * 
 * Usage:
 *   node scripts/reconciliation-cli.js <command> [options]
 * 
 * Commands:
 *   run         - Run one-time reconciliation
 *   schedule    - Schedule automatic reconciliation
 *   stop        - Stop scheduled reconciliation
 *   health      - Check reconciliation system health
 *   orphans     - Find orphan payments
 *   sync        - Sync pending payments
 *   report      - Generate detailed report
 * 
 * Options:
 *   --start-date  - Start date (ISO format)
 *   --end-date    - End date (ISO format)
 *   --format      - Report format (json|csv)
 *   --interval    - Schedule interval in hours
 */

const { paymentReconciliationService } = require('../dist/services/payment-reconciliation.js');

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    console.log('Usage: node reconciliation-cli.js <command> [options]');
    console.log('Commands: run, schedule, stop, health, orphans, sync, report');
    process.exit(1);
  }

  // Parse options
  const options = {};
  for (let i = 1; i < args.length; i += 2) {
    if (args[i].startsWith('--')) {
      const key = args[i].substring(2).replace(/-([a-z])/g, (g) => g[1].toUpperCase());
      options[key] = args[i + 1];
    }
  }

  try {
    switch (command) {
      case 'run':
        await runReconciliation(options);
        break;
      
      case 'schedule':
        await scheduleReconciliation(options);
        break;
      
      case 'stop':
        await stopReconciliation();
        break;
      
      case 'health':
        await checkHealth();
        break;
      
      case 'orphans':
        await findOrphans(options);
        break;
      
      case 'sync':
        await syncPending();
        break;
      
      case 'report':
        await generateReport(options);
        break;
      
      default:
        console.error(`Unknown command: ${command}`);
        process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

async function runReconciliation(options) {
  console.log('🔄 Running payment reconciliation...');
  
  const startDate = options.startDate ? new Date(options.startDate) : undefined;
  const endDate = options.endDate ? new Date(options.endDate) : undefined;

  const report = await paymentReconciliationService.reconcileTransactions(startDate, endDate);
  
  console.log('\n📊 Reconciliation Results:');
  console.log(`Report ID: ${report.reportId}`);
  console.log(`Period: ${report.period.start.toISOString()} to ${report.period.end.toISOString()}`);
  console.log(`Local Transactions: ${report.summary.totalLocalTransactions}`);
  console.log(`Stripe Transactions: ${report.summary.totalStripeTransactions}`);
  console.log(`Matched: ${report.summary.matchedTransactions}`);
  console.log(`Discrepancies: ${report.summary.discrepancies}`);
  console.log(`Local Orphans: ${report.summary.orphanPayments.local}`);
  console.log(`Stripe Orphans: ${report.summary.orphanPayments.stripe}`);
  console.log(`Amount Discrepancy: $${report.summary.amountDiscrepancy.toFixed(2)}`);

  if (report.discrepancies.length > 0) {
    console.log('\n⚠️  Discrepancies Found:');
    report.discrepancies.forEach((disc, i) => {
      console.log(`${i + 1}. ${disc.type}: ${disc.description} (${disc.severity})`);
    });
  }

  if (report.recommendations.length > 0) {
    console.log('\n💡 Recommendations:');
    report.recommendations.forEach((rec, i) => {
      console.log(`${i + 1}. ${rec}`);
    });
  }
}

async function scheduleReconciliation(options) {
  const interval = parseInt(options.interval) || 1;
  console.log(`⏰ Scheduling reconciliation every ${interval} hours...`);
  
  paymentReconciliationService.scheduleReconciliation(interval);
  console.log('✅ Reconciliation scheduled successfully');
  console.log('💡 The reconciliation will run automatically in the background');
  console.log('💡 Use "node reconciliation-cli.js stop" to stop the schedule');
  
  // Keep the process running
  process.stdin.resume();
}

async function stopReconciliation() {
  console.log('🛑 Stopping scheduled reconciliation...');
  
  paymentReconciliationService.stopScheduledReconciliation();
  console.log('✅ Reconciliation scheduling stopped');
}

async function checkHealth() {
  console.log('🏥 Checking reconciliation system health...');
  
  const health = await paymentReconciliationService.getReconciliationHealth();
  
  console.log(`\n📈 Health Status: ${getStatusEmoji(health.status)} ${health.status.toUpperCase()}`);
  console.log(`Pending Transactions: ${health.pendingTransactions}`);
  console.log(`Recent Discrepancies: ${health.recentDiscrepancies}`);
  
  if (health.checks) {
    console.log('\n🔍 System Checks:');
    Object.entries(health.checks).forEach(([system, check]) => {
      const status = typeof check === 'object' ? check.status : check;
      const emoji = status === 'connected' || status === 'healthy' ? '✅' : '❌';
      console.log(`${emoji} ${system}: ${status}`);
      
      if (typeof check === 'object' && check.error) {
        console.log(`   Error: ${check.error}`);
      }
    });
  }
}

async function findOrphans(options) {
  console.log('🔍 Searching for orphan payments...');
  
  const startDate = options.startDate ? new Date(options.startDate) : undefined;
  const endDate = options.endDate ? new Date(options.endDate) : undefined;

  const orphans = await paymentReconciliationService.detectOrphanPayments(startDate, endDate);
  
  console.log(`\n📋 Found ${orphans.length} orphan payments:`);
  
  if (orphans.length === 0) {
    console.log('✅ No orphan payments found');
    return;
  }

  const localOrphans = orphans.filter(o => o.type === 'local');
  const stripeOrphans = orphans.filter(o => o.type === 'stripe');

  if (localOrphans.length > 0) {
    console.log(`\n🏠 Local Orphans (${localOrphans.length}):`);
    localOrphans.forEach((orphan, i) => {
      console.log(`${i + 1}. ${orphan.id}: $${orphan.amount} ${orphan.currency} (${orphan.status})`);
      console.log(`   Reason: ${orphan.reason}`);
      console.log(`   Action: ${orphan.suggestedAction}`);
    });
  }

  if (stripeOrphans.length > 0) {
    console.log(`\n💳 Stripe Orphans (${stripeOrphans.length}):`);
    stripeOrphans.forEach((orphan, i) => {
      console.log(`${i + 1}. ${orphan.id}: $${orphan.amount} ${orphan.currency} (${orphan.status})`);
      console.log(`   Reason: ${orphan.reason}`);
      console.log(`   Action: ${orphan.suggestedAction}`);
    });
  }
}

async function syncPending() {
  console.log('🔄 Syncing pending payments...');
  
  const result = await paymentReconciliationService.syncPendingPayments();
  
  console.log(`\n📊 Sync Results:`);
  console.log(`Updated Transactions: ${result.updated}`);
  console.log(`Errors: ${result.errors.length}`);
  
  if (result.errors.length > 0) {
    console.log('\n❌ Errors:');
    result.errors.forEach((error, i) => {
      console.log(`${i + 1}. Transaction ${error.id}: ${error.error}`);
    });
  }

  if (result.updated > 0) {
    console.log(`✅ Successfully updated ${result.updated} transactions`);
  }
}

async function generateReport(options) {
  console.log('📄 Generating reconciliation report...');
  
  const startDate = options.startDate ? new Date(options.startDate) : undefined;
  const endDate = options.endDate ? new Date(options.endDate) : undefined;
  const format = options.format || 'json';

  const { filePath, report } = await paymentReconciliationService.generateReconciliationReport(
    format,
    startDate,
    endDate
  );
  
  console.log(`\n📁 Report generated: ${filePath}`);
  console.log(`📊 Report ID: ${report.reportId}`);
  console.log(`🕒 Timestamp: ${report.timestamp.toISOString()}`);
  console.log(`📈 Summary: ${report.summary.matchedTransactions}/${report.summary.totalLocalTransactions} matched, ${report.summary.discrepancies} discrepancies`);
  
  if (format === 'json') {
    console.log(`💻 You can also access this report via API:`);
    console.log(`   GET /api/admin/reconciliation/download?path=${encodeURIComponent(filePath)}`);
  }
}

function getStatusEmoji(status) {
  switch (status) {
    case 'healthy': return '✅';
    case 'warning': return '⚠️';
    case 'critical': return '❌';
    default: return '❓';
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...');
  paymentReconciliationService.stopScheduledReconciliation();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down gracefully...');
  paymentReconciliationService.stopScheduledReconciliation();
  process.exit(0);
});

// Run the CLI
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}