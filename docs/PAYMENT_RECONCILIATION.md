# Payment Reconciliation System

A comprehensive payment reconciliation system for FacePay that automatically compares local transaction records with Stripe payment data, detects discrepancies, identifies orphan payments, and generates detailed reports.

## Features

- 🔄 **Automated Reconciliation**: Compare local transactions with Stripe records
- 🔍 **Discrepancy Detection**: Identify amount, status, and metadata mismatches
- 👻 **Orphan Payment Detection**: Find payments that exist in only one system
- 🔄 **Pending Payment Sync**: Automatically update pending transaction statuses
- 📊 **Detailed Reporting**: Generate JSON and CSV reports with actionable insights
- ⏰ **Scheduled Execution**: Run reconciliation automatically at specified intervals
- 🚨 **Real-time Alerting**: Get notified about critical discrepancies
- 🏥 **Health Monitoring**: Monitor system status and performance
- 📱 **CLI Tool**: Command-line interface for manual operations
- 🌐 **REST API**: Programmatic access to all reconciliation features

## Installation

The reconciliation service is part of the FacePay core services. No additional installation is required.

## Quick Start

### Using the CLI Tool

```bash
# Run a one-time reconciliation
node scripts/reconciliation-cli.js run

# Check system health
node scripts/reconciliation-cli.js health

# Find orphan payments
node scripts/reconciliation-cli.js orphans

# Sync pending payments
node scripts/reconciliation-cli.js sync

# Generate a detailed report
node scripts/reconciliation-cli.js report --format csv

# Schedule automatic reconciliation every 2 hours
node scripts/reconciliation-cli.js schedule --interval 2
```

### Using the API

```javascript
// Run reconciliation
const response = await fetch('/api/admin/reconciliation', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'reconcile',
    startDate: '2024-01-01T00:00:00Z',
    endDate: '2024-01-02T00:00:00Z'
  })
});

// Check health
const health = await fetch('/api/admin/reconciliation?action=health');

// Get orphan payments
const orphans = await fetch('/api/admin/reconciliation?action=orphans');
```

### Using the Service Directly

```typescript
import { paymentReconciliationService } from '@/services/payment-reconciliation';

// Run reconciliation
const report = await paymentReconciliationService.reconcileTransactions();

// Check health
const health = await paymentReconciliationService.getReconciliationHealth();

// Schedule automatic reconciliation
paymentReconciliationService.scheduleReconciliation(1); // Every hour
```

## API Reference

### REST Endpoints

#### GET /api/admin/reconciliation

Get reconciliation status and information.

**Query Parameters:**
- `action` (optional): Specific action to perform
  - `health` - Get system health status
  - `orphans` - Get orphan payments
  - `report` - Generate and download report
- `startDate` (optional): Start date for queries (ISO format)
- `endDate` (optional): End date for queries (ISO format)
- `format` (optional): Report format (`json` | `csv`)

**Examples:**

```bash
# Get general status
curl "http://localhost:3000/api/admin/reconciliation"

# Get system health
curl "http://localhost:3000/api/admin/reconciliation?action=health"

# Get orphan payments for date range
curl "http://localhost:3000/api/admin/reconciliation?action=orphans&startDate=2024-01-01&endDate=2024-01-02"

# Generate CSV report
curl "http://localhost:3000/api/admin/reconciliation?action=report&format=csv"
```

#### POST /api/admin/reconciliation

Trigger reconciliation processes.

**Request Body:**
```json
{
  "action": "reconcile|sync|schedule|stop-schedule",
  "startDate": "2024-01-01T00:00:00Z",
  "endDate": "2024-01-02T00:00:00Z",
  "intervalHours": 1
}
```

**Examples:**

```bash
# Run reconciliation
curl -X POST "http://localhost:3000/api/admin/reconciliation" \
  -H "Content-Type: application/json" \
  -d '{"action": "reconcile"}'

# Sync pending payments
curl -X POST "http://localhost:3000/api/admin/reconciliation" \
  -H "Content-Type: application/json" \
  -d '{"action": "sync"}'

# Schedule automatic reconciliation
curl -X POST "http://localhost:3000/api/admin/reconciliation" \
  -H "Content-Type: application/json" \
  -d '{"action": "schedule", "intervalHours": 2}'
```

### Service Methods

#### `reconcileTransactions(startDate?, endDate?)`

Main reconciliation method that compares local and Stripe transactions.

**Parameters:**
- `startDate` (Date, optional): Start of date range
- `endDate` (Date, optional): End of date range

**Returns:** `ReconciliationReport`

```typescript
const report = await paymentReconciliationService.reconcileTransactions(
  new Date('2024-01-01'),
  new Date('2024-01-02')
);

console.log(`Found ${report.discrepancies.length} discrepancies`);
```

#### `detectOrphanPayments(startDate?, endDate?)`

Find payments that exist in one system but not the other.

**Returns:** `OrphanPayment[]`

```typescript
const orphans = await paymentReconciliationService.detectOrphanPayments();
const localOrphans = orphans.filter(o => o.type === 'local');
const stripeOrphans = orphans.filter(o => o.type === 'stripe');
```

#### `syncPendingPayments()`

Update pending transaction statuses based on Stripe data.

**Returns:** `{ updated: number, errors: Array<{id: string, error: string}> }`

```typescript
const result = await paymentReconciliationService.syncPendingPayments();
console.log(`Updated ${result.updated} transactions`);
```

#### `generateReconciliationReport(format, startDate?, endDate?)`

Generate detailed reconciliation report.

**Parameters:**
- `format`: 'json' | 'csv'
- `startDate` (Date, optional): Start of date range
- `endDate` (Date, optional): End of date range

**Returns:** `{ filePath: string, report: ReconciliationReport }`

```typescript
const { filePath, report } = await paymentReconciliationService.generateReconciliationReport('csv');
console.log(`Report saved to: ${filePath}`);
```

#### `scheduleReconciliation(intervalHours)`

Schedule automatic reconciliation.

**Parameters:**
- `intervalHours` (number): Hours between reconciliation runs

```typescript
// Run every 2 hours
paymentReconciliationService.scheduleReconciliation(2);
```

#### `getReconciliationHealth()`

Get system health and status information.

**Returns:** Health status object

```typescript
const health = await paymentReconciliationService.getReconciliationHealth();
console.log(`System status: ${health.status}`);
console.log(`Pending transactions: ${health.pendingTransactions}`);
```

## Data Structures

### ReconciliationReport

```typescript
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
```

### ReconciliationDiscrepancy

```typescript
interface ReconciliationDiscrepancy {
  type: 'amount_mismatch' | 'status_mismatch' | 'missing_local' | 'missing_stripe' | 'metadata_mismatch';
  localTransaction?: LocalTransaction;
  stripeTransaction?: StripeTransaction;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recommendedAction: string;
}
```

### OrphanPayment

```typescript
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
```

## Configuration

### Environment Variables

```bash
# Required for Stripe integration
STRIPE_SECRET_KEY=sk_test_...

# Database connection
DATABASE_URL=postgresql://...

# Optional monitoring
NEXT_PUBLIC_SENTRY_DSN=...
```

### Default Settings

- **Default reconciliation period**: Last 24 hours
- **Pending payment timeout**: 24 hours
- **Transaction matching tolerance**: $0.01 and 5 minutes
- **Critical discrepancy threshold**: Amount mismatches, completed/failed status conflicts
- **Default schedule interval**: 1 hour

## Monitoring and Alerts

### Health Checks

The system performs continuous health monitoring:

- ✅ Database connectivity
- ✅ Stripe API connectivity
- ✅ Pending transaction count
- ✅ Recent discrepancy count
- ✅ System performance metrics

### Alerting

Automatic alerts are generated for:

- 🚨 **Critical discrepancies**: Amount mismatches, status conflicts
- ⚠️ **High orphan count**: More than 10 orphan payments
- ⚠️ **System errors**: API failures, database issues
- 📊 **Performance issues**: Slow reconciliation, timeouts

### Logging

All operations are logged with:

- 📝 Reconciliation results
- 🔍 Discrepancy details
- 👻 Orphan payment information
- ⚡ Performance metrics
- ❌ Error tracking

## Best Practices

### Reconciliation Frequency

- **High-volume systems**: Every 15-30 minutes
- **Medium-volume systems**: Every 1-2 hours
- **Low-volume systems**: Every 4-6 hours
- **Batch processing**: Daily or weekly

### Error Handling

1. **Automatic retry**: Failed operations retry with exponential backoff
2. **Graceful degradation**: Continue with available data when APIs are down
3. **Manual intervention**: Clear escalation paths for critical issues
4. **Audit trail**: Complete record of all reconciliation activities

### Performance Optimization

1. **Batch processing**: Process transactions in batches
2. **Parallel requests**: Fetch data from multiple sources simultaneously
3. **Caching**: Cache frequently accessed data
4. **Indexing**: Proper database indexes for fast queries

## Troubleshooting

### Common Issues

#### No transactions found

**Symptoms:** Reconciliation reports show zero transactions
**Causes:**
- Date range outside available data
- Database connectivity issues
- Stripe API key problems

**Solutions:**
1. Check date range parameters
2. Verify database connection
3. Validate Stripe API credentials

#### High discrepancy count

**Symptoms:** Many discrepancies in reports
**Causes:**
- Webhook failures
- System downtime during payments
- Clock synchronization issues

**Solutions:**
1. Check webhook configuration
2. Review system uptime logs
3. Verify server time synchronization

#### Performance issues

**Symptoms:** Slow reconciliation, timeouts
**Causes:**
- Large transaction volumes
- Database performance
- Stripe API rate limits

**Solutions:**
1. Increase batch size limits
2. Optimize database queries
3. Implement request throttling

### Debug Commands

```bash
# Check system health
node scripts/reconciliation-cli.js health

# Test with small date range
node scripts/reconciliation-cli.js run --start-date "2024-01-01" --end-date "2024-01-01"

# Generate detailed report
node scripts/reconciliation-cli.js report --format json

# Check for orphans only
node scripts/reconciliation-cli.js orphans
```

### Log Analysis

Check application logs for reconciliation activities:

```bash
# Search for reconciliation logs
grep "reconciliation" logs/application.log

# Check for errors
grep "ERROR.*reconciliation" logs/error.log

# Monitor performance
grep "reconciliation_total" logs/performance.log
```

## Security Considerations

### Data Protection

- 🔒 **Encryption**: All financial data encrypted at rest and in transit
- 🔐 **Access Control**: Role-based access to reconciliation functions
- 🛡️ **Audit Trail**: Complete logging of all operations
- 🚫 **Data Retention**: Automatic cleanup of old report files

### API Security

- 🔑 **Authentication**: Required for all admin endpoints
- 🛡️ **Authorization**: Admin-only access to reconciliation functions
- 🚦 **Rate Limiting**: Prevent abuse of reconciliation APIs
- 📝 **Request Logging**: Track all API usage

## Development and Testing

### Running Tests

```bash
# Run reconciliation tests
npm test -- payment-reconciliation

# Run specific test suites
npm test -- --testNamePattern="reconcileTransactions"

# Run with coverage
npm test -- --coverage payment-reconciliation.test.ts
```

### Local Development

```bash
# Start development server
npm run dev

# Run reconciliation manually
node scripts/reconciliation-cli.js run

# Check health status
curl "http://localhost:3000/api/admin/reconciliation?action=health"
```

### Mock Data Setup

```bash
# Create test transactions
npm run seed:test-data

# Run reconciliation against test data
node scripts/reconciliation-cli.js run --start-date "2024-01-01" --end-date "2024-01-02"
```

## Support

For issues, questions, or feature requests:

1. Check the [troubleshooting guide](#troubleshooting)
2. Review system logs
3. Test with CLI tool
4. Contact development team

---

## Version History

### v1.0.0 (Current)
- ✅ Initial reconciliation system
- ✅ Stripe integration
- ✅ Orphan payment detection
- ✅ Automated reporting
- ✅ CLI tool
- ✅ REST API
- ✅ Health monitoring
- ✅ Scheduled execution

### Planned Features
- 🔄 Multi-processor support (PayPal, Ethereum)
- 📊 Advanced analytics dashboard
- 🔔 Enhanced notification system
- 🎯 Machine learning anomaly detection
- 📱 Mobile app integration